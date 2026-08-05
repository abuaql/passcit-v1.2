import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import { clearStudyContentField } from "@/lib/ai/study-content-cache";
import { logger } from "@/lib/logger";
import type { StudyLanguage } from "@/generated/prisma/client";

// Derived from the single language list so a new language never needs a
// second edit here. The assertion is only about tuple shape (z.enum needs a
// non-empty tuple), not about the values themselves.
const LANGUAGE_CODES = STUDY_LANGUAGES.map((l) => l.code) as [StudyLanguage, ...StudyLanguage[]];

const bodySchema = z.object({
  questionId: z.string().min(1),
  language: z.enum(LANGUAGE_CODES),
  type: z.enum(["explanation", "translation", "memoryTip"]),
});

/**
 * The only supported path to regeneration, and admin-only by policy.
 *
 * Clears the stored field rather than regenerating inline: the next reader
 * regenerates it through the normal cached path, so this stays fast, cannot
 * time out on a large batch, and never double-charges for content nobody has
 * asked for yet.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof Response) return guard;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { questionId, language, type } = parsed.data;

  try {
    await clearStudyContentField(questionId, language, type);
    logger.info("admin.studyContent", `Cleared ${type} for ${questionId} (${language}) for regeneration`);
    return NextResponse.json({ cleared: true, questionId, language, type });
  } catch (error) {
    logger.error("admin.studyContent", "Could not clear study content", error);
    return NextResponse.json({ error: "Could not clear that content." }, { status: 500 });
  }
}
