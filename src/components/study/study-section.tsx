"use client";

import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { strings } from "@/lib/i18n";

export type StudySectionStatus = "idle" | "loading" | "ready" | "error";

/**
 * One collapsible study card.
 *
 * Purely presentational — it knows nothing about generation, so the same
 * component serves explanation, translation and memory tip, and will serve
 * future AI sections unchanged.
 */
export function StudySection({
  id,
  title,
  icon: Icon,
  open,
  status,
  onToggle,
  onRetry,
  rtl = false,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  open: boolean;
  status: StudySectionStatus;
  onToggle: () => void;
  onRetry: () => void;
  /** Generated content in Arabic or Urdu must render right-to-left. */
  rtl?: boolean;
  children?: React.ReactNode;
}) {
  const panelId = `${id}-panel`;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-2 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1 font-heading font-bold text-foreground">{title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <CardContent id={panelId} className="border-t-2 border-border px-4 pb-4 pt-3">
          {status === "loading" && <StudySkeleton />}

          {status === "error" && (
            <div className="space-y-2" role="alert">
              <p className="text-sm font-semibold text-foreground">{strings.study.failedTitle}</p>
              <p className="text-sm text-muted-foreground">{strings.study.failedBody}</p>
              <button
                type="button"
                onClick={onRetry}
                className="rounded-xl border-2 border-border px-3 py-1.5 text-sm font-semibold text-primary hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {strings.study.retry}
              </button>
            </div>
          )}

          {status === "ready" && (
            // dir is set per section, never on the page: the official English
            // question and answer must keep their own direction regardless of
            // the language chosen for study content.
            <div dir={rtl ? "rtl" : "ltr"} className="space-y-2">
              {children}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Skeleton rather than a spinner: it holds the space the text will occupy, so
 * the card does not jump when content arrives, and it reads as "this is being
 * written" rather than "something is stuck".
 */
function StudySkeleton() {
  return (
    <div className="space-y-2" aria-live="polite" aria-busy="true">
      <span className="sr-only">{strings.study.generating}</span>
      <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-11/12 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded-full bg-muted" />
    </div>
  );
}
