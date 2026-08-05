import { prisma } from "@/lib/prisma";
import { CATEGORY_LABELS } from "@/lib/categories";
import { STUDY_LANGUAGES } from "@/lib/ai/languages";
import type { QuestionCategory, StudyActionType, StudyLanguage } from "@/generated/prisma/client";

const DAY_MS = 1000 * 60 * 60 * 24;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => isoDate(new Date(Date.now() - (n - 1 - i) * DAY_MS)));
}

export interface DailyPoint {
  date: string;
  count: number;
}

/** Distinct users with study activity on each of the last `days` days. */
export async function getDailyActiveUsers(days = 14): Promise<DailyPoint[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const sessions = await prisma.studySession.findMany({
    where: { date: { gte: since } },
    select: { date: true, userId: true },
  });

  const byDay = new Map<string, Set<string>>();
  for (const s of sessions) {
    const key = isoDate(s.date);
    if (!byDay.has(key)) byDay.set(key, new Set());
    byDay.get(key)!.add(s.userId);
  }

  return lastNDays(days).map((date) => ({ date, count: byDay.get(date)?.size ?? 0 }));
}

/** New signups per day over the window — a simple, honest proxy for user growth at this scale. */
export async function getUserGrowth(days = 14): Promise<DailyPoint[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  const users = await prisma.user.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const byDay = new Map<string, number>();
  for (const u of users) {
    const key = isoDate(u.createdAt);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  return lastNDays(days).map((date) => ({ date, count: byDay.get(date) ?? 0 }));
}

export interface LabeledStat {
  label: string;
  value: number;
}

/** Average score percent, broken down by practice mode. */
export async function getAverageScoresByMode(): Promise<LabeledStat[]> {
  const tests = await prisma.practiceTest.findMany({
    where: { completedAt: { not: null }, score: { not: null } },
    select: { mode: true, score: true, totalQuestions: true },
  });

  const byMode = new Map<string, { sum: number; count: number }>();
  for (const t of tests) {
    if (!t.totalQuestions) continue;
    const ratio = (t.score ?? 0) / t.totalQuestions;
    const existing = byMode.get(t.mode) ?? { sum: 0, count: 0 };
    existing.sum += ratio;
    existing.count += 1;
    byMode.set(t.mode, existing);
  }

  return Array.from(byMode.entries())
    .map(([mode, { sum, count }]) => ({
      label: mode.replace(/_/g, " "),
      value: Math.round((sum / count) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

/** Completed practice sessions per test version. */
export async function getTestVersionUsage(): Promise<LabeledStat[]> {
  const versions = await prisma.testVersion.findMany({
    select: { name: true, _count: { select: { practiceTests: true } } },
    orderBy: { year: "asc" },
  });
  return versions.map((v) => ({ label: v.name.replace(" Civics Test", ""), value: v._count.practiceTests }));
}

export interface CategoryPerformance {
  category: QuestionCategory;
  categoryLabel: string;
  accuracyPercent: number;
  attemptCount: number;
}

/** Accuracy percent per category, from actual practice-test answers. */
export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  const answers = await prisma.practiceTestAnswer.findMany({
    select: { isCorrect: true, question: { select: { category: true } } },
  });

  const byCategory = new Map<QuestionCategory, { correct: number; total: number }>();
  for (const a of answers) {
    const existing = byCategory.get(a.question.category) ?? { correct: 0, total: 0 };
    existing.total += 1;
    if (a.isCorrect) existing.correct += 1;
    byCategory.set(a.question.category, existing);
  }

  return Array.from(byCategory.entries())
    .map(([category, { correct, total }]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
      attemptCount: total,
    }))
    .sort((a, b) => b.attemptCount - a.attemptCount);
}

// ── Interview Simulation analytics (Phase 7) ────────────────────────────
// Deliberately separate functions rather than parameterizing the two
// functions above to accept either PracticeTestAnswer or
// InterviewCivicsAnswer — they're different Prisma models with different
// shapes, so a shared abstraction would need its own indirection layer
// for no real benefit. What's reused is the *pattern*: fetch, aggregate
// in JS with a Map, same as above.

export interface InterviewOverview {
  totalInterviews: number;
  passRate: number | null;
  averageScorePercent: number | null;
  averageDurationSec: number | null;
}

export async function getInterviewOverview(): Promise<InterviewOverview> {
  const completed = await prisma.interviewSimulation.findMany({
    where: { completedAt: { not: null } },
    select: { passed: true, civicsCorrectCount: true, civicsIncorrectCount: true, durationSec: true },
  });

  if (completed.length === 0) {
    return { totalInterviews: 0, passRate: null, averageScorePercent: null, averageDurationSec: null };
  }

  const passedCount = completed.filter((i) => i.passed).length;

  const scored = completed.filter((i) => i.civicsCorrectCount + i.civicsIncorrectCount > 0);
  const averageScorePercent =
    scored.length > 0
      ? Math.round(
          (scored.reduce((sum, i) => sum + i.civicsCorrectCount / (i.civicsCorrectCount + i.civicsIncorrectCount), 0) /
            scored.length) *
            100
        )
      : null;

  const timed = completed.filter((i) => i.durationSec !== null);
  const averageDurationSec =
    timed.length > 0 ? Math.round(timed.reduce((sum, i) => sum + (i.durationSec ?? 0), 0) / timed.length) : null;

  return {
    totalInterviews: completed.length,
    passRate: Math.round((passedCount / completed.length) * 100),
    averageScorePercent,
    averageDurationSec,
  };
}

export interface MissedInterviewQuestionStat {
  questionId: string;
  number: number;
  question: string;
  missedCount: number;
  attemptCount: number;
}

export async function getMostMissedInterviewQuestions(limit = 10): Promise<MissedInterviewQuestionStat[]> {
  const answers = await prisma.interviewCivicsAnswer.findMany({
    select: {
      questionId: true,
      isCorrect: true,
      question: { select: { number: true, question: true } },
    },
  });

  const byQuestion = new Map<string, { number: number; question: string; missed: number; total: number }>();
  for (const a of answers) {
    const existing = byQuestion.get(a.questionId) ?? {
      number: a.question.number,
      question: a.question.question,
      missed: 0,
      total: 0,
    };
    existing.total += 1;
    if (!a.isCorrect) existing.missed += 1;
    byQuestion.set(a.questionId, existing);
  }

  return Array.from(byQuestion.entries())
    .map(([questionId, stat]) => ({
      questionId,
      number: stat.number,
      question: stat.question,
      missedCount: stat.missed,
      attemptCount: stat.total,
    }))
    .filter((s) => s.missedCount > 0)
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, limit);
}

/** Sorted worst-accuracy-first, unlike getCategoryPerformance (sorted by volume) — "most difficult" means lowest accuracy, not most-attempted. */
export async function getMostDifficultInterviewCategories() {
  const answers = await prisma.interviewCivicsAnswer.findMany({
    select: { isCorrect: true, question: { select: { category: true } } },
  });

  const byCategory = new Map<QuestionCategory, { correct: number; total: number }>();
  for (const a of answers) {
    const existing = byCategory.get(a.question.category) ?? { correct: 0, total: 0 };
    existing.total += 1;
    if (a.isCorrect) existing.correct += 1;
    byCategory.set(a.question.category, existing);
  }

  return Array.from(byCategory.entries())
    .map(([category, { correct, total }]) => ({
      category,
      categoryLabel: CATEGORY_LABELS[category],
      accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : 0,
      attemptCount: total,
    }))
    .filter((c) => c.attemptCount > 0)
    .sort((a, b) => a.accuracyPercent - b.accuracyPercent);
}

export interface StudyContentLanguageCoverage {
  language: StudyLanguage;
  label: string;
  explanations: number;
  translations: number;
  memoryTips: number;
  failed: number;
}

export interface StudyContentCoverage {
  totalActiveQuestions: number;
  languagesInUse: number;
  totals: { explanations: number; translations: number; memoryTips: number; failed: number };
  byLanguage: StudyContentLanguageCoverage[];
}

/**
 * How much AI study content is generated and cached, counted by status.
 *
 * Counts COMPLETED rather than "text is not null", matching the rest of the
 * architecture: status is the source of truth everywhere, and a coverage
 * number derived from a different rule than the cache uses would eventually
 * disagree with it. FAILED is surfaced too — a language quietly failing is
 * exactly the thing an admin needs to see and would otherwise be invisible.
 *
 * Three grouped queries rather than loading rows: the generated text columns
 * are large, and none of it is needed to count anything.
 */
export async function getStudyContentCoverage(): Promise<StudyContentCoverage> {
  const [explanationRows, translationRows, memoryTipRows, totalActiveQuestions] = await Promise.all([
    prisma.questionStudyContent.groupBy({ by: ["language", "explanationStatus"], _count: { _all: true } }),
    prisma.questionStudyContent.groupBy({ by: ["language", "translationStatus"], _count: { _all: true } }),
    prisma.questionStudyContent.groupBy({ by: ["language", "memoryTipStatus"], _count: { _all: true } }),
    prisma.question.count({ where: { isActive: true } }),
  ]);

  const completed = new Map<string, number>();
  const failed = new Map<StudyLanguage, number>();

  const addCompleted = (language: StudyLanguage, field: string, n: number) =>
    completed.set(`${language}:${field}`, (completed.get(`${language}:${field}`) ?? 0) + n);
  const addFailed = (language: StudyLanguage, n: number) =>
    failed.set(language, (failed.get(language) ?? 0) + n);

  // Three explicit loops rather than one generic helper: each status column
  // has a different name, and a helper generic enough to read all three would
  // need a cast that stops TypeScript checking those names at all.
  for (const row of explanationRows) {
    if (row.explanationStatus === "COMPLETED") addCompleted(row.language, "explanation", row._count._all);
    else if (row.explanationStatus === "FAILED") addFailed(row.language, row._count._all);
  }
  for (const row of translationRows) {
    if (row.translationStatus === "COMPLETED") addCompleted(row.language, "translation", row._count._all);
    else if (row.translationStatus === "FAILED") addFailed(row.language, row._count._all);
  }
  for (const row of memoryTipRows) {
    if (row.memoryTipStatus === "COMPLETED") addCompleted(row.language, "memoryTip", row._count._all);
    else if (row.memoryTipStatus === "FAILED") addFailed(row.language, row._count._all);
  }

  const byLanguage: StudyContentLanguageCoverage[] = STUDY_LANGUAGES.map((info) => ({
    language: info.code,
    label: info.englishName,
    explanations: completed.get(`${info.code}:explanation`) ?? 0,
    translations: completed.get(`${info.code}:translation`) ?? 0,
    memoryTips: completed.get(`${info.code}:memoryTip`) ?? 0,
    failed: failed.get(info.code) ?? 0,
  }));

  return {
    totalActiveQuestions,
    languagesInUse: byLanguage.filter((l) => l.explanations + l.translations + l.memoryTips + l.failed > 0).length,
    totals: {
      explanations: byLanguage.reduce((s, l) => s + l.explanations, 0),
      translations: byLanguage.reduce((s, l) => s + l.translations, 0),
      memoryTips: byLanguage.reduce((s, l) => s + l.memoryTips, 0),
      failed: byLanguage.reduce((s, l) => s + l.failed, 0),
    },
    byLanguage,
  };
}

export interface StudyActionUsage {
  action: StudyActionType;
  count: number;
}

/**
 * How often each study action is used.
 *
 * StudyActionEvent was being written and never read, which makes the data
 * collection pointless — this is the surface that gives it a purpose. Purely
 * observational: nothing in the study flow reads it.
 */
export async function getStudyActionUsage(): Promise<StudyActionUsage[]> {
  const rows = await prisma.studyActionEvent.groupBy({
    by: ["action"],
    _count: { _all: true },
  });
  const counts = new Map(rows.map((r) => [r.action, r._count._all]));
  const ORDER: StudyActionType[] = ["EXPLANATION", "TRANSLATION", "MEMORY_TIP", "LISTEN"];
  return ORDER.map((action) => ({ action, count: counts.get(action) ?? 0 }));
}
