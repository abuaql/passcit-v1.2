"use client";

import { useState } from "react";
import { BookOpen, Globe, Brain, Volume2, Square, FlaskConical } from "lucide-react";
import { StudySection, type StudySectionStatus } from "@/components/study/study-section";
import { StudyLanguageSelector } from "@/components/study/language-selector";
import { useStudyLanguage } from "@/components/study/study-language-provider";
import { useSpeech } from "@/hooks/useSpeech";
import { studyLanguageInfo } from "@/lib/ai/languages";
import { speechTagFor } from "@/lib/ai/speech-service";
import { strings } from "@/lib/i18n";
import type { StudyLanguage } from "@/generated/prisma/client";

type Section = "explanation" | "translation" | "memoryTip";
interface Translation {
  question: string;
  answer: string;
}
type SectionContent = string | Translation;

const SECTIONS: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "explanation", label: strings.study.explanation, icon: BookOpen },
  { id: "translation", label: strings.study.translation, icon: Globe },
  { id: "memoryTip", label: strings.study.memoryTip, icon: Brain },
];

/**
 * The study experience beneath a question.
 *
 * Nothing is generated when a question opens — only when a button is pressed,
 * which is what keeps cost proportional to what people actually read.
 * Results are held per language, so switching away and back is instant and
 * never re-requests something already fetched this session (the server caches
 * permanently regardless; this just avoids a needless round trip).
 *
 * One section is open at a time. That keeps a phone screen calm, and makes
 * "the currently visible section" unambiguous for the Listen button.
 */
export function StudyPanel({
  questionId,
  officialQuestion,
  officialAnswers,
}: {
  questionId: string;
  officialQuestion: string;
  officialAnswers: string[];
}) {
  const { language } = useStudyLanguage();

  // The open section is stored together with the language it was opened for,
  // and "which section is open" is derived from that. Changing language
  // therefore collapses the sections on its own — no effect watching the
  // language, and no window where a card shows the previous language's text
  // under a new heading.
  const [openState, setOpenState] = useState<{ section: Section; language: StudyLanguage } | null>(null);
  const open = openState && openState.language === language ? openState.section : null;
  const [content, setContent] = useState<Record<string, SectionContent>>({});
  const [status, setStatus] = useState<Record<string, "loading" | "error">>({});
  // Set from the API response. Environment-level, not per item: when no API
  // key is configured every generation is a local placeholder.
  const [devMode, setDevMode] = useState(false);

  const { speak, stop, isPlaying, isSupported } = useSpeech();
  const speechId = `study-${questionId}`;
  const info = studyLanguageInfo(language);
  const cacheKey = (section: Section) => `${language}:${section}`;

  /**
   * Analytics only. Fire-and-forget and fully swallowed: nothing about
   * studying may depend on, wait for, or fail because of it.
   */
  function recordAction(action: "EXPLANATION" | "TRANSLATION" | "MEMORY_TIP" | "LISTEN") {
    void fetch("/api/study-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, action, language }),
    }).catch(() => {});
  }

  const ACTION_FOR: Record<Section, "EXPLANATION" | "TRANSLATION" | "MEMORY_TIP"> = {
    explanation: "EXPLANATION",
    translation: "TRANSLATION",
    memoryTip: "MEMORY_TIP",
  };

  async function load(section: Section) {
    const key = cacheKey(section);
    setStatus((s) => ({ ...s, [key]: "loading" }));
    try {
      const res = await fetch(`/api/questions/${questionId}/study`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: section, language }),
      });
      if (!res.ok) throw new Error("Request failed");
      const json = await res.json();
      if (json.devMode) setDevMode(true);
      const value: SectionContent =
        section === "translation" ? (json.translation as Translation) : (json[section] as string);
      if (!value) throw new Error("Empty content");
      setContent((c) => ({ ...c, [key]: value }));
      setStatus((s) => {
        const next = { ...s };
        delete next[key];
        return next;
      });
    } catch {
      setStatus((s) => ({ ...s, [key]: "error" }));
    }
  }

  function toggle(section: Section) {
    if (open === section) {
      setOpenState(null);
      return;
    }
    setOpenState({ section, language });
    recordAction(ACTION_FOR[section]);
    const key = cacheKey(section);
    // Already fetched, or already being fetched — never fire a second request.
    if (content[key] || status[key]) return;
    void load(section);
  }

  function sectionStatus(section: Section): StudySectionStatus {
    const key = cacheKey(section);
    if (status[key] === "loading") return "loading";
    if (status[key] === "error") return "error";
    return content[key] ? "ready" : "idle";
  }

  /** Reads the open section in the selected language, or the official English question and answer when nothing is open. */
  function handleListen() {
    if (isPlaying(speechId)) {
      stop();
      return;
    }
    recordAction("LISTEN");
    const key = open ? cacheKey(open) : null;
    const value = key ? content[key] : undefined;

    if (open && value) {
      const text =
        typeof value === "string"
          ? value
          : `${value.question}. ${value.answer}`;
      speak(text, speechId, speechTagFor(language));
      return;
    }
    // Official content is English, so it is always read with an English voice
    // no matter which study language is selected.
    speak(`${officialQuestion}. ${officialAnswers.join(", ")}`, speechId, "en-US");
  }

  return (
    <div className="space-y-4">
      {/* Same shared value as the selector above the question list — both read and write one provider. */}
      <StudyLanguageSelector id="study-language-panel" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => toggle(section.id)}
            aria-expanded={open === section.id}
            className={
              open === section.id
                ? "flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-primary bg-primary/10 px-2 py-2 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                : "flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-border px-2 py-2 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            }
          >
            <section.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{section.label}</span>
          </button>
        ))}

        {isSupported && (
          <button
            type="button"
            onClick={handleListen}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border-2 border-border px-2 py-2 text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isPlaying(speechId) ? (
              <>
                <Square className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{strings.study.stopListening}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{strings.study.listen}</span>
              </>
            )}
          </button>
        )}
      </div>

      {devMode && (
        <div
          className="flex items-start gap-2 rounded-2xl border-2 border-accent bg-accent/10 p-3 text-sm text-accent-foreground"
          role="status"
        >
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-heading font-bold">{strings.study.developmentMode}</p>
            <p className="text-xs">{strings.study.developmentModeHelp}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {SECTIONS.map((section) => {
          const value = content[cacheKey(section.id)];
          return (
            <StudySection
              key={section.id}
              id={`${section.id}-${questionId}`}
              title={section.label}
              icon={section.icon}
              open={open === section.id}
              status={sectionStatus(section.id)}
              onToggle={() => toggle(section.id)}
              onRetry={() => void load(section.id)}
              rtl={info.rtl}
            >
              {section.id === "translation" && value && typeof value !== "string" ? (
                <>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {strings.study.translatedQuestionLabel}
                    </p>
                    <p className="text-base text-foreground">{value.question}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {strings.study.translatedAnswerLabel}
                    </p>
                    <p className="text-base font-semibold text-foreground">{value.answer}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{strings.study.officialNote}</p>
                </>
              ) : (
                // whitespace-pre-line preserves the paragraph breaks and
                // "- " bullets the prompts ask for, without pulling in a
                // markdown renderer and its sanitisation burden.
                <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
                  {typeof value === "string" ? value : ""}
                </p>
              )}
            </StudySection>
          );
        })}
      </div>
    </div>
  );
}
