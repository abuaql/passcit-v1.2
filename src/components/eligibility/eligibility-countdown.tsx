"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/i18n";

const DAY_MS = 86_400_000;

function daysUntil(now: Date, target: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

/**
 * Live countdown to the eligibility and filing dates.
 *
 * `now` is seeded with a lazy initial value rather than being set inside an
 * effect: this component only ever mounts after ResultsStep has fetched its
 * data client-side, so it is never part of the server-rendered output and
 * cannot produce a hydration mismatch. The interval then refreshes it, which
 * is a deferred callback rather than a synchronous set during the effect.
 *
 * A one-minute tick is deliberate — these countdowns are measured in days,
 * so a per-second timer would burn wakeups to redraw an identical number.
 */
export function EligibilityCountdown({
  greenCardDate,
  eligibilityDate,
  earliestFilingDate,
}: {
  greenCardDate: Date;
  eligibilityDate: Date;
  earliestFilingDate: Date;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isEligible = now >= eligibilityDate;
  const canFile = now >= earliestFilingDate;

  const totalMs = eligibilityDate.getTime() - greenCardDate.getTime();
  const elapsedMs = now.getTime() - greenCardDate.getTime();
  const timeProgress =
    totalMs > 0 ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100))) : 100;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          {isEligible ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {strings.eligibility.results.countdown.title}
            </p>
            <p className="font-heading text-lg font-bold text-foreground">
              {isEligible
                ? strings.eligibility.results.countdown.eligibleNow
                : strings.eligibility.results.countdown.daysUntilEligible(daysUntil(now, eligibilityDate))}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {canFile
                ? strings.eligibility.results.countdown.filingOpenNow
                : strings.eligibility.results.countdown.daysUntilFiling(daysUntil(now, earliestFilingDate))}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{strings.eligibility.results.countdown.timeProgressLabel}</span>
            <span className="font-heading font-bold text-foreground">{timeProgress}%</span>
          </div>
          <div
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={timeProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={strings.eligibility.results.countdown.timeProgressLabel}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${timeProgress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
