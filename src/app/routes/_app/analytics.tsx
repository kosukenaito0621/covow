import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addMonths, isYearMonth, jstThisMonth } from "@shared/date/jst";
import { insightsQuery } from "../../api/data";
import { InsightsSkeleton } from "../../components/loading/PageSkeletons";
import { Reveal, Stale, useStartedLoading } from "../../components/ui/Reveal";
import { ErrorMessage } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { InsightsScreen } from "../../screens/InsightsScreen";
import { useTheme } from "../../theme/ThemeProvider";
import { tourEvent } from "../../tour/missions";

type InsightsSearch = { month?: string };

export const Route = createFileRoute("/_app/analytics")({
  validateSearch: (s: Record<string, unknown>): InsightsSearch => ({
    month: typeof s.month === "string" && isYearMonth(s.month) ? s.month : undefined,
  }),
  component: Analytics,
});

/** 分析（概要・カテゴリ・推移・メンバー別）。計算はサーバー（shared/money）で済ませた値を表示する */
function Analytics() {
  const search = Route.useSearch();
  const month = search.month ?? jstThisMonth();
  const thisMonth = jstThisMonth();
  const navigate = useNavigate();
  const { t } = useT();
  const { theme } = useTheme();
  const q = useQuery(insightsQuery(month));
  const reveal = useStartedLoading(q.isPending);
  const setMonth = (m: string) => void navigate({ to: "/analytics", search: m === thisMonth ? {} : { month: m } });

  return (
    <main className="app-shell flex flex-col gap-5">
      {q.isPending ? (
        <InsightsSkeleton />
      ) : q.isError ? (
        <ErrorMessage tone={theme.tone.page} onRetry={() => void q.refetch()} />
      ) : (
        <Reveal active={reveal} className="flex flex-col gap-5">
          <Stale stale={q.isPlaceholderData} className="flex flex-col gap-5">
            <InsightsScreen
              key={month}
              data={{
                ...q.data,
                // 未分類は画面の言語の名前で出す
                categories: q.data.categories.map((c) => (c.categoryId === null ? { ...c, name: t("badge.uncategorized") } : c)),
              }}
              showMembers={q.data.memberCount > 1 || q.data.members.some((m) => m.id === null)}
              onPrevMonth={() => setMonth(addMonths(month, -1))}
              onNextMonth={() => setMonth(addMonths(month, 1))}
              onTabChange={() => tourEvent("insights-switched")}
            />
          </Stale>
        </Reveal>
      )}
    </main>
  );
}
