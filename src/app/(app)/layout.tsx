import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getActiveTestVersion, getAllTestVersions } from "@/lib/questions";
import { Navbar } from "@/components/layout/navbar";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { StudyLanguageProvider } from "@/components/study/study-language-provider";
import { getUserStudyLanguage } from "@/lib/ai/study-language";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const [testVersions, activeTestVersion, studyLanguage] = await Promise.all([
    getAllTestVersions(),
    getActiveTestVersion(session.user.id),
    getUserStudyLanguage(session.user.id),
  ]);

  return (
    <StudyLanguageProvider initialLanguage={studyLanguage}>
      <div className="min-h-screen bg-background">
      <Navbar testVersions={testVersions} activeTestVersionId={activeTestVersion.id} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-6">
        <InstallPrompt />
        {children}
      </main>
        <MobileTabBar />
      </div>
    </StudyLanguageProvider>
  );
}
