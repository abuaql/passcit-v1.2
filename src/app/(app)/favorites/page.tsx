import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTestVersion } from "@/lib/questions";
import { getFavoriteQuestions } from "@/lib/progress";
import { FavoritesList } from "@/components/questions/favorites-list";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Favorites" };

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const testVersion = await getActiveTestVersion(session.user.id);
  const rows = await getFavoriteQuestions(session.user.id, testVersion.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
          {strings.studyLists.favoritesTitle}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{strings.studyLists.favoritesSubtitle}</p>
      </div>

      <FavoritesList rows={rows} />
    </div>
  );
}
