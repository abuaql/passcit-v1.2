import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Target } from "lucide-react";
import { auth } from "@/auth";
import { getActiveTestVersion } from "@/lib/questions";
import { getCompletedQuestions } from "@/lib/progress";
import { StudyQuestionItem } from "@/components/questions/study-question-item";
import { EmptyState } from "@/components/ui/empty-state";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Questions Completed" };

function formatCompletedDate(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function CompletedQuestionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const testVersion = await getActiveTestVersion(session.user.id);
  const rows = await getCompletedQuestions(session.user.id, testVersion.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          {strings.studyLists.completedTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{strings.studyLists.completedSubtitle}</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title={strings.studyLists.completedEmptyTitle}
          description={strings.studyLists.completedEmptyBody}
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-muted-foreground">
            {strings.studyLists.countLabel(rows.length)}
          </p>
          <div className="space-y-3">
            {rows.map((row) => (
              <StudyQuestionItem
                key={row.id}
                data={row}
                meta={
                  row.completedAt ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {strings.studyLists.completedOn(formatCompletedDate(row.completedAt))}
                    </span>
                  ) : null
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
