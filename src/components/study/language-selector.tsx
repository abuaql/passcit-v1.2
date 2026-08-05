"use client";

import { Globe } from "lucide-react";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import { useStudyLanguage } from "@/components/study/study-language-provider";
import { strings } from "@/lib/i18n";
import type { StudyLanguage } from "@/generated/prisma/client";

/**
 * Picks the language for explanations, translations, memory tips and audio.
 *
 * Holds no state of its own — every instance reads and writes the shared
 * provider, so the copy above the question list and the copy inside the study
 * panel are always showing the same value.
 */
export function StudyLanguageSelector({ id = "study-language" }: { id?: string }) {
  const { language, setLanguage, saveFailed } = useStudyLanguage();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Globe className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {strings.study.languageLabel}
      </label>
      <select
        id={id}
        value={language}
        onChange={(e) => setLanguage(e.target.value as StudyLanguage)}
        className="h-11 w-full rounded-2xl border-2 border-border bg-card px-3 text-sm text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {STUDY_LANGUAGES.map((entry) => (
          <option key={entry.code} value={entry.code}>
            {entry.nativeName}
            {entry.nativeName === entry.englishName ? "" : ` — ${entry.englishName}`}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">{strings.study.languageHelp}</p>
      {saveFailed && (
        <p className="text-xs text-destructive" role="alert">
          {strings.study.languageSaveFailed}
        </p>
      )}
    </div>
  );
}
