import type { Metadata } from "next";
import { TrendingUp, Users, Target, AlertTriangle, Layers, BarChart3, ClipboardCheck, Award, Clock3, Languages, Globe, Brain, BookOpen, MousePointerClick } from "lucide-react";
import { getDailyActiveUsers, getUserGrowth, getAverageScoresByMode, getTestVersionUsage, getCategoryPerformance, getInterviewOverview, getMostMissedInterviewQuestions, getMostDifficultInterviewCategories, getStudyContentCoverage, getStudyActionUsage } from "@/lib/admin-analytics";
import { getMostMissedQuestions } from "@/lib/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart } from "@/components/admin/charts";
import type { StudyActionType } from "@/generated/prisma/client";
import { strings } from "@/lib/i18n";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const [
    dau,
    growth,
    scoresByMode,
    versionUsage,
    categoryPerformance,
    missed,
    interviewOverview,
    missedInterviewQuestions,
    difficultInterviewCategories,
  ] = await Promise.all([
    getDailyActiveUsers(14),
    getUserGrowth(14),
    getAverageScoresByMode(),
    getTestVersionUsage(),
    getCategoryPerformance(),
    getMostMissedQuestions(8),
    getInterviewOverview(),
    getMostMissedInterviewQuestions(8),
    getMostDifficultInterviewCategories(),
  ]);

  const [studyContentCoverage, studyActions] = await Promise.all([
    getStudyContentCoverage(),
    getStudyActionUsage(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-3xl font-bold text-foreground">{strings.admin.analytics.title}</h1>
        <p className="text-muted-foreground">{strings.admin.analytics.subtitle}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.dailyActiveUsers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={dau} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-secondary" aria-hidden="true" />
              {strings.admin.analytics.userGrowth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={growth} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" aria-hidden="true" />
              {strings.admin.analytics.averageScoresByMode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={scoresByMode} suffix="%" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-secondary" aria-hidden="true" />
              {strings.admin.analytics.testVersionUsage}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={versionUsage} suffix=" sessions" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.categoryPerformance}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={categoryPerformance.map((c) => ({ label: c.categoryLabel, value: c.accuracyPercent }))}
              suffix="%"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              {strings.admin.analytics.mostMissedQuestions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={missed.map((m) => ({ label: `#${m.number} ${m.question.slice(0, 40)}${m.question.length > 40 ? "…" : ""}`, value: m.missedCount }))}
              suffix=" missed"
            />
          </CardContent>
        </Card>
      </div>

      <h2 className="pt-2 font-heading text-xl font-bold text-foreground">
        {strings.admin.analytics.interviewSectionTitle}
      </h2>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AnalyticsStatTile
          icon={ClipboardCheck}
          label={strings.admin.analytics.totalInterviews}
          value={String(interviewOverview.totalInterviews)}
        />
        <AnalyticsStatTile
          icon={Award}
          label={strings.admin.analytics.passRate}
          value={interviewOverview.passRate !== null ? `${interviewOverview.passRate}%` : "—"}
        />
        <AnalyticsStatTile
          icon={Target}
          label={strings.admin.analytics.averageScore}
          value={interviewOverview.averageScorePercent !== null ? `${interviewOverview.averageScorePercent}%` : "—"}
        />
        <AnalyticsStatTile
          icon={Clock3}
          label={strings.admin.analytics.averageDuration}
          value={
            interviewOverview.averageDurationSec !== null
              ? `${Math.floor(interviewOverview.averageDurationSec / 60)}m ${interviewOverview.averageDurationSec % 60}s`
              : "—"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
              {strings.admin.analytics.mostMissedInterviewQuestions}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={missedInterviewQuestions.map((m) => ({
                label: `#${m.number} ${m.question.slice(0, 40)}${m.question.length > 40 ? "…" : ""}`,
                value: m.missedCount,
              }))}
              suffix=" missed"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {strings.admin.analytics.mostDifficultCategories}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={difficultInterviewCategories.map((c) => ({ label: c.categoryLabel, value: c.accuracyPercent }))}
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">
          {strings.admin.analytics.studyContentSectionTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {strings.admin.analytics.studyContentSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <AnalyticsStatTile
          icon={Languages}
          label={strings.admin.analytics.languagesInUse}
          value={String(studyContentCoverage.languagesInUse)}
        />
        <AnalyticsStatTile
          icon={BookOpen}
          label={strings.admin.analytics.cachedExplanations}
          value={String(studyContentCoverage.totals.explanations)}
        />
        <AnalyticsStatTile
          icon={Globe}
          label={strings.admin.analytics.cachedTranslations}
          value={String(studyContentCoverage.totals.translations)}
        />
        <AnalyticsStatTile
          icon={Brain}
          label={strings.admin.analytics.cachedMemoryTips}
          value={String(studyContentCoverage.totals.memoryTips)}
        />
        <AnalyticsStatTile
          icon={AlertTriangle}
          label={strings.admin.analytics.failedGenerations}
          value={String(studyContentCoverage.totals.failed)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{strings.admin.analytics.coverageByLanguage}</CardTitle>
          <CardDescription>
            {strings.admin.analytics.ofQuestions(studyContentCoverage.totalActiveQuestions)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">{strings.admin.analytics.languageColumn}</th>
                  <th className="px-3 py-2">{strings.admin.analytics.explanationsColumn}</th>
                  <th className="px-3 py-2">{strings.admin.analytics.translationsColumn}</th>
                  <th className="px-3 py-2">{strings.admin.analytics.memoryTipsColumn}</th>
                  <th className="px-3 py-2">{strings.admin.analytics.failedColumn}</th>
                </tr>
              </thead>
              <tbody>
                {studyContentCoverage.byLanguage.map((row) => (
                  <tr key={row.language} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-semibold text-foreground">{row.label}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.explanations}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.translations}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.memoryTips}</td>
                    <td className={row.failed > 0 ? "px-3 py-2 font-semibold text-destructive" : "px-3 py-2 text-muted-foreground"}>
                      {row.failed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-heading text-lg font-bold text-foreground">
          {strings.admin.analytics.studyActionsTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {strings.admin.analytics.studyActionsSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {studyActions.map((entry) => (
          <AnalyticsStatTile
            key={entry.action}
            icon={MousePointerClick}
            label={STUDY_ACTION_LABELS[entry.action]}
            value={String(entry.count)}
          />
        ))}
      </div>
    </div>
  );
}

const STUDY_ACTION_LABELS: Record<StudyActionType, string> = {
  EXPLANATION: strings.admin.analytics.actionExplanation,
  TRANSLATION: strings.admin.analytics.actionTranslation,
  MEMORY_TIP: strings.admin.analytics.actionMemoryTip,
  LISTEN: strings.admin.analytics.actionListen,
};

function AnalyticsStatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
          <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-bold leading-tight text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
