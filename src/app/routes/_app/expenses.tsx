import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { addMonths, isYearMonth, jstThisMonth } from "@shared/date/jst";
import { formatMonth, formatShortDate } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { expensesQuery } from "../../api/data";
import { AddPill } from "../../components/glass/AddPill";
import { GlassCard } from "../../components/glass/GlassCard";
import { CategoryBadge, FromPlanBadge } from "../../components/ui/Badges";
import { CircleIconButton } from "../../components/ui/Buttons";
import { Icon } from "../../components/ui/Icon";
import { mutedText } from "../../components/ui/SectionLabel";
import { ExpensesListSkeleton } from "../../components/loading/PageSkeletons";
import { Reveal, Stale, useStartedLoading } from "../../components/ui/Reveal";
import { EmptyState, ErrorMessage, LoadingSkeleton } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { useExpenseForm } from "../../screens/forms/useForms";
import { useTheme } from "../../theme/ThemeProvider";

type ExpensesSearch = { month?: string };

export const Route = createFileRoute("/_app/expenses")({
  validateSearch: (s: Record<string, unknown>): ExpensesSearch => ({
    month: typeof s.month === "string" && isYearMonth(s.month) ? s.month : undefined,
  }),
  component: Expenses,
});

/** 支出の一覧（月ごと）。予定から作られた支出には印を付ける。右下のボタンで予定なしの支出を記録する */
function Expenses() {
  const search = Route.useSearch();
  const month = search.month ?? jstThisMonth();
  const navigate = useNavigate();
  const { t, locale } = useT();
  const { theme } = useTheme();
  const list = useQuery(expensesQuery(month));
  const reveal = useStartedLoading(list.isPending);
  const form = useExpenseForm();
  const muted = mutedText(theme.tone.card);
  const thisMonth = jstThisMonth();
  const setMonth = (m: string) => void navigate({ to: "/expenses", search: m === thisMonth ? {} : { month: m } });
  const total = list.data?.reduce((a, e) => a + e.actualAmount, 0) ?? 0;

  return (
    <main className="app-shell flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CircleIconButton tone={theme.tone.page} icon="arrowLeft" label={t("common.back")} onClick={() => void navigate({ to: "/" })} />
          <h1 className="text-[28px] leading-none font-bold tracking-tight">{t("expenses.title")}</h1>
        </div>
        <div className="-ml-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <CircleIconButton tone={theme.tone.page} icon="chevronLeft" label={t("home.prevMonth")} onClick={() => setMonth(addMonths(month, -1))} />
            <p className="num text-[15px] font-semibold">{formatMonth(month, locale)}</p>
            <CircleIconButton tone={theme.tone.page} icon="chevronRight" label={t("home.nextMonth")} onClick={() => setMonth(addMonths(month, 1))} />
          </div>
          {list.data && list.data.length > 0 && (
            <p className="num text-[15px] font-semibold">
              {t("insights.total")} {formatYen(total)}
            </p>
          )}
        </div>
      </header>

      {list.isPending ? (
        <LoadingSkeleton>
          <ExpensesListSkeleton />
        </LoadingSkeleton>
      ) : list.isError ? (
        <ErrorMessage tone={theme.tone.page} onRetry={() => void list.refetch()} />
      ) : (
        <Reveal active={reveal}>
          <Stale stale={list.isPlaceholderData}>
            {list.data.length === 0 ? (
              <GlassCard>
                <EmptyState
                  tone={theme.tone.card}
                  icon="receipt"
                  title={t("expenses.empty")}
                  body={t("expenses.emptyBody")}
                  action={{ label: t("expense.add"), onClick: () => form.open() }}
                />
              </GlassCard>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {list.data.map((e) => (
                  <li key={e.id}>
                    <GlassCard>
                      <button type="button" onClick={() => form.open(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{e.title}</p>
                          <p className={`num mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] ${muted}`}>
                            <span>{e.recordedByName}</span>
                            <span>・ {formatShortDate(e.spentAt, locale)}</span>
                            <CategoryBadge name={e.categoryName} />
                            {e.purchasePlanId && <FromPlanBadge />}
                          </p>
                        </div>
                        <span className="num shrink-0 text-[15px] font-semibold">{formatYen(e.actualAmount)}</span>
                        <Icon name="chevronRight" size={18} className="shrink-0 opacity-70" />
                      </button>
                    </GlassCard>
                  </li>
                ))}
              </ul>
            )}
          </Stale>
        </Reveal>
      )}

      <div
        data-fixed-overlay
        data-tour="add-expense"
        className="rounded-full fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px+var(--coach-h,0px))] z-30"
      >
        <AddPill onClick={() => form.open()} label={t("expense.add")} />
      </div>
      {form.element}
    </main>
  );
}
