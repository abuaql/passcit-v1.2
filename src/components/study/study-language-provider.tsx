"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { DEFAULT_STUDY_LANGUAGE } from "@/lib/ai/languages";
import type { StudyLanguage } from "@/generated/prisma/client";

const LOCAL_KEY = "passcit-study-language";

interface StudyLanguageValue {
  language: StudyLanguage;
  setLanguage: (next: StudyLanguage) => void;
  /** True when the last save could not reach the account. */
  saveFailed: boolean;
}

const StudyLanguageContext = createContext<StudyLanguageValue | null>(null);

/**
 * Single source of truth for the study language.
 *
 * The selector appears in two places — above the question list and inside the
 * study panel — and they must agree. Holding the value in one provider makes
 * that structural: there is only ever one language, so the two controls
 * cannot disagree, and neither needs its own persistence logic.
 *
 * Mounted at the app layout, so the value also survives navigation between
 * the list and a question without a refetch.
 */
export function StudyLanguageProvider({
  initialLanguage,
  children,
}: {
  initialLanguage: StudyLanguage;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<StudyLanguage>(initialLanguage);
  const [saveFailed, setSaveFailed] = useState(false);

  const setLanguage = useCallback((next: StudyLanguage) => {
    // Applied locally first: the UI should never feel like it is waiting on
    // the network to honour a dropdown.
    setLanguageState(next);
    setSaveFailed(false);

    try {
      window.localStorage.setItem(LOCAL_KEY, next);
    } catch {
      // Private modes can refuse storage; the choice still applies this session.
    }

    void (async () => {
      try {
        const res = await fetch("/api/user/study-language", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: next }),
        });
        if (!res.ok) throw new Error("Request failed");
      } catch {
        // Kept applied rather than reverted — silently undoing someone's
        // choice is worse than telling them it did not sync.
        setSaveFailed(true);
      }
    })();
  }, []);

  return (
    <StudyLanguageContext.Provider value={{ language, setLanguage, saveFailed }}>
      {children}
    </StudyLanguageContext.Provider>
  );
}

export function useStudyLanguage(): StudyLanguageValue {
  const context = useContext(StudyLanguageContext);
  // Falling back keeps any component usable outside the provider (tests,
  // future public pages) instead of crashing the tree.
  return (
    context ?? {
      language: DEFAULT_STUDY_LANGUAGE,
      setLanguage: () => {},
      saveFailed: false,
    }
  );
}
