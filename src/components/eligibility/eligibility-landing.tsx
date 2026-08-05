"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EligibilityWizard } from "@/components/eligibility/eligibility-wizard";
import { ResultsStep } from "@/components/eligibility/steps/results-step";
import { strings } from "@/lib/i18n";

/**
 * Now that each user has exactly one eligibility profile, a returning user
 * should land on their saved result rather than an empty wizard. The
 * countdown and progress inside ResultsStep are recomputed against the
 * current date on every visit, so the saved profile stays accurate as time
 * passes without anyone re-running anything.
 */
export function EligibilityLanding({ existingId }: { existingId: string | null }) {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard || !existingId) return <EligibilityWizard />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.eligibility.title}</h1>
        <p className="mt-2 text-muted-foreground">{strings.eligibility.subtitle}</p>
      </div>

      <ResultsStep calculationId={existingId} />

      <p className="text-center text-xs text-muted-foreground">
        {strings.eligibility.results.savedProfileNote}
      </p>

      <Button variant="outline" className="w-full" onClick={() => setShowWizard(true)}>
        {strings.eligibility.results.recalculate}
      </Button>
    </div>
  );
}
