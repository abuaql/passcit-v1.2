import { studyLanguageInfo } from "@/lib/ai/languages";
import type { StudyLanguage } from "@/generated/prisma/client";

/**
 * Voice selection for multilingual text-to-speech.
 *
 * Deliberately a selection helper rather than a second playback system:
 * useSpeech already owns the single SpeechSynthesis queue, and a parallel
 * player would fight it over cancel()/speak() and desynchronise the
 * "currently playing" indicator. This decides *which voice*; useSpeech still
 * decides when anything speaks.
 */

/** BCP-47 tag for a study language, e.g. "ar-SA". */
export function speechTagFor(language: StudyLanguage): string {
  return studyLanguageInfo(language).speechTag;
}

/**
 * Best available voice for a tag.
 *
 * Tries the exact tag first ("pt-BR"), then any voice sharing the base
 * language ("pt-PT" for "pt-BR"). Installed voices vary enormously by
 * platform, so a same-language regional voice is far better than silently
 * reading Portuguese with an English voice. Returns null when nothing
 * matches, letting the caller fall back to the browser default.
 */
export function selectVoiceForLanguage(
  voices: SpeechSynthesisVoice[],
  tag: string
): SpeechSynthesisVoice | null {
  const wanted = tag.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === wanted);
  if (exact) return exact;

  const base = wanted.split("-")[0];
  const sameLanguage = voices.find((v) => v.lang.toLowerCase().split("-")[0] === base);
  return sameLanguage ?? null;
}
