import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { addMonths, isYearMonth, jstThisMonth } from "@shared/date/jst";
import { formatMonth, formatShortDate } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { involves, userShare } from "@shared/money/split";
import { expensesQuery } from "../../api/data";
import { meQuery } from "../../api/me";
import { spaceQuery } from "../../api/space";
import { TabChips } from "../../components/glass/TabChips";
import { AddPill } from "../../components/glass/AddPill";
import { GlassCard } from "../../components/glass/GlassCard";
import { CategoryBadge, FromPlanBadge, SplitBadge } from "../../components/ui/Badges";
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

const EVERYONE = "__everyone__";
type Source = "all" | "fromPlan" | "unplanned";

/**
 * 支出の一覧（月ごと）。予定から作られた支出には印を付ける。右下のボタンで予定なしの支出を記録する。
 * 人（払った人か分けた相手）と、予定から／予定外で絞り込める。人で絞ったときの合計は、その人の分。
 */
function Expenses() {
  const search = Route.useSearch();
  const month = search.month ?? jstThisMonth();
  const navigate = useNavigate();
  const { t, locale } = useT();
  const { theme } = useTheme();
  const list = useQuery(expensesQuery(month));
  const space = useQuery(spaceQuery);
  const me = useQuery(meQuery).data?.user.id ?? "";
  const members = space.data?.members ?? [];
  const [person, setPerson] = useState(EVERYONE);
  const [source, setSource] = useState<Source>("all");
  const reveal = useStartedLoading(list.isPending);
  const form = useExpenseForm();
  const muted = mutedText(theme.tone.card);
  const thisMonth = jstThisMonth();
  const setMonth = (m: string) => void navigate({ to: "/expenses", search: m === thisMonth ? {} : { month: m } });
  const shown = (list.data ?? [])
    .filter((e) => person === EVERYONE || involves(e, person))
    .filter((e) => source === "all" || (source === "fromPlan") === !!e.purchasePlanId);
  const total = shown.reduce((a, e) => a + (person === EVERYONE ? e.actualAmount : userShare(e.actualAmount, e, person)), 0);

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
          {shown.length > 0 && (
            <p className="num text-[15px] font-semibold">
              {t("insights.total")} {formatYen(total)}
            </p>
          )}
        </div>
      </header>

      {members.length > 1 && (
        <TabChips
          label={t("filter.person")}
          value={person}
          onChange={setPerson}
          tone={theme.tone.page}
          options={[{ value: EVERYONE, label: t("filter.everyone") }, ...members.map((m) => ({ value: m.id, label: m.id === me ? t("payer.me") : m.displayName }))]}
        />
      )}
      <TabChips
        label={t("plans.filter")}
        value={source}
        onChange={setSource}
        tone={theme.tone.page}
        options={[
          { value: "all", label: t("home.all") },
          { value: "fromPlan", label: t("filter.fromPlan") },
          { value: "unplanned", label: t("filter.unplanned") },
        ]}
      />

      {list.isPending ? (
        <LoadingSkeleton>
          <ExpensesListSkeleton />
        </LoadingSkeleton>
      ) : list.isError ? (
        <ErrorMessage tone={theme.tone.page} onRetry={() => void list.refetch()} />
      ) : (
        <Reveal active={reveal}>
          <Stale stale={list.isPlaceholderData}>
            {shown.length === 0 ? (
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
                {shown.map((e) => (
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
                      {e.splitUserId && <SplitBadge myShare={involves(e, me) ? userShare(e.actualAmount, e, me) : null} />}
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
