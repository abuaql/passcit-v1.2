import Link from "next/link";
import { Sparkles, MapPin, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CATEGORY_BADGE_VARIANT } from "@/lib/categories";
import { strings } from "@/lib/i18n";
import type { StudyQuestionRow } from "@/lib/progress";

/**
 * Shared list item for the Completed Questions and Favorites pages.
 *
 * Deliberately separate from QuestionCard: that one is a compact browse
 * tile that clamps the question and truncates the answer to a single muted
 * line. These pages are for review, so the full question and full answer
 * both need to be readable without opening anything.
 *
 * `meta` and `actions` are slots so both pages share one layout while
 * supplying their own trailing content (completion date, remove button).
 */
export function StudyQuestionItem({
  data,
  meta,
  actions,
}: {
  data: StudyQuestionRow;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={CATEGORY_BADGE_VARIANT[data.category]}>
          {CATEGORY_LABELS[data.category]}
        </Badge>
        {meta}
      </div>

      <p className="font-heading text-base font-bold text-foreground sm:text-lg">
        {data.number}. {data.question}
      </p>

      <div className="rounded-2xl bg-muted/50 p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {strings.studyLists.answerLabel}
        </p>
        {data.variesByLocation ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {strings.questions.variesByLocationShort}
          </p>
        ) : data.isDynamicAnswer ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
            {strings.questions.dynamicAnswerShort}
          </p>
        ) : (
          <ul className="mt-1 space-y-0.5">
            {data.answers.map((a) => (
              <li key={a.text} className="text-sm text-foreground">
                {a.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={`/questions/${data.id}`}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {strings.studyLists.openQuestion}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        {actions}
      </div>
    </Card>
  );
}
