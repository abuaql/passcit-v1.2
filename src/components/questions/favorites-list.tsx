"use client";

import { useState } from "react";
import { Heart, HeartOff } from "lucide-react";
import { StudyQuestionItem } from "@/components/questions/study-question-item";
import { EmptyState } from "@/components/ui/empty-state";
import { FormErrorBanner } from "@/components/ui/form-error-banner";
import { strings } from "@/lib/i18n";
import type { StudyQuestionRow } from "@/lib/progress";

/**
 * Client-side because removing a favorite should take the item out of the
 * list immediately — leaving an un-favorited question sitting on the
 * Favorites page until a refresh would be confusing.
 */
export function FavoritesList({ rows: initialRows }: { rows: StudyQuestionRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function removeFavorite(questionId: string) {
    setPendingId(questionId);
    setFailed(false);
    try {
      const res = await fetch(`/api/questions/${questionId}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      // The endpoint toggles, so confirm it actually landed on "not a
      // favorite" before dropping the row. If two tabs raced and it came
      // back favorited again, leave it in place rather than hiding a
      // question the server still considers saved.
      if (data.isFavorite === false) {
        setRows((current) => current.filter((row) => row.id !== questionId));
      }
    } catch {
      setFailed(true);
    } finally {
      setPendingId(null);
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title={strings.studyLists.favoritesEmptyTitle}
        description={strings.studyLists.favoritesEmptyBody}
      />
    );
  }

  return (
    <>
      {failed && <FormErrorBanner>{strings.studyLists.removeFailed}</FormErrorBanner>}

      <p className="text-sm font-semibold text-muted-foreground">
        {strings.studyLists.countLabel(rows.length)}
      </p>

      <div className="space-y-3">
        {rows.map((row) => (
          <StudyQuestionItem
            key={row.id}
            data={row}
            actions={
              <button
                type="button"
                onClick={() => removeFavorite(row.id)}
                disabled={pendingId === row.id}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <HeartOff className="h-4 w-4" aria-hidden="true" />
                {strings.studyLists.removeFavorite}
              </button>
            }
          />
        ))}
      </div>
    </>
  );
}
