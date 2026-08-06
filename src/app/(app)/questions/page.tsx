import type { Metadata } from "next";
import { auth } from "@/auth";
import { getActiveTestVersion, getQuestions } from "@/lib/questions";
import { QuestionCard } from "@/components/questions/question-card";
import { QuestionFiltersBar } from "@/components/questions/question-filters";
import { SpeedControl } from "@/components/ui/speed-control";
import { EmptyState } from "@/components/ui/empty-state";
import { FileQuestion } from "lucide-react";
import { StudyLanguageSelector } from "@/components/study/language-selector";
import { strings } from "@/lib/i18n";
import type { QuestionCategory } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Browse Questions" };

const VALID_CATEGORIES = new Set(["AMERICAN_GOVERNMENT", "AMERICAN_HISTORY", "INTEGRATED_CIVICS"]);

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const testVersion = await getActiveTestVersion(session?.user?.id);

  const categoryParam = typeof params.category === "string" ? params.category : undefined;
  const category = categoryParam && VALID_CATEGORIES.has(categoryParam)
    ? (categoryParam as QuestionCategory)
    : undefined;

  const questions = await getQuestions({
    testVersionId: testVersion.id,
    category,
    search: typeof params.q === "string" ? params.q : undefined,
    favoritesOnly: params.favorites === "true",
    special6520Only: params.special6520 === "true",
    userId: session?.user?.id,
  });

  return (
    <div className="space-y-6">
      {/* Sits directly under the navbar's test selector. The same shared value
          the study panel uses, so setting it here before opening a question
          carries straight through. */}
      <StudyLanguageSelector id="study-language-list" />

      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.questions.browseTitle}</h1>
        <p className="text-muted-foreground">
          {strings.questions.browseSubtitle(testVersion.totalQuestions, testVersion.name)}
        </p>
      </div>

      <QuestionFiltersBar />
      <SpeedControl />

      {questions.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title={strings.questions.noResultsTitle}
          description={strings.questions.noResultsBody}
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {strings.questions.questionCount(questions.length)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
           {questions.map((question) => (
           <QuestionCard
           key={question.id}
           data={question}
    />
  ))}
</div>
        </>
      )}
    </div>
  );
}
