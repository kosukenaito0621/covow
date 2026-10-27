import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { addDays, addMonths, isYearMonth, jstThisMonth, weekDates, weekStartOf, yearMonthOf } from "@shared/date/jst";
import { formatMonth, formatShortDate, textLocale, weekdayName } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { dailyQuery, summaryQuery } from "../../api/data";
import { meQuery } from "../../api/me";
import { spaceQuery } from "../../api/space";
import { DayChips } from "../../components/charts/DayChips";
import { SpendCurve } from "../../components/charts/SpendCurve";
import { WeekNavigator } from "../../components/charts/WeekNavigator";
import { AddPill } from "../../components/glass/AddPill";
import { DeltaBadge } from "../../components/glass/DeltaBadge";
import { GlassCard } from "../../components/glass/GlassCard";
import { HeroGlassCard } from "../../components/glass/HeroGlassCard";
import { MetricPill } from "../../components/glass/MetricPill";
import { UsedBar } from "../../components/glass/UsedBar";
import { Avatar } from "../../components/ui/Avatar";
import { CircleIconButton, PrimaryButton, SecondaryButton } from "../../components/ui/Buttons";
import { HeroAmount } from "../../components/ui/HeroAmount";
import { Icon } from "../../components/ui/Icon";
import { LABEL, mutedText } from "../../components/ui/SectionLabel";
import { HomeBodySkeleton } from "../../components/loading/PageSkeletons";
import { Reveal, Stale, useStartedLoading } from "../../components/ui/Reveal";
import { AttentionNote, EmptyState, ErrorMessage, Skeleton } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { phrase } from "../../i18n/phrases";
import { useBudgetSheet } from "../../screens/forms/BudgetSheet";
import { tourEvent } from "../../tour/missions";
import { offerKey, useTour } from "../../tour/TourProvider";
import { useExpenseForm, usePlanForm } from "../../screens/forms/useForms";
import { useTheme } from "../../theme/ThemeProvider";
import { PersonSwitch, useViewUser } from "../../components/PersonSwitch";

type HomeSearch = { month?: string; user?: string };

export const Route = createFileRoute("/_app/")({
  validateSearch: (s: Record<string, unknown>): HomeSearch => ({
    month: typeof s.month === "string" && isYearMonth(s.month) ? s.month : undefined,
    // だれの数字を見るか（省けば自分）
    user: typeof s.user === "string" && s.user ? s.user : undefined,
  }),
  component: Home,
});

/**
 * ホーム：月の「あと使える金額」（予算 − 実支出 − 予定額）、週の支出の曲線、実支出・予定額・使用率、直近の予定。
 * 金額はサーバーが shared/money で計算した値をそのまま出す。
 */
function Home() {
  const search = Route.useSearch();
  const month = search.month ?? jstThisMonth();
  const navigate = useNavigate();
  const { t, locale } = useT();
  const { theme } = useTheme();
  const { view, isMe } = useViewUser(search.user);
  const summary = useQuery(summaryQuery(month, search.user));
  const reveal = useStartedLoading(summary.isPending);
  const space = useQuery(spaceQuery);
  const planForm = usePlanForm();
  const expenseForm = useExpenseForm();
  const budgetSheet = useBudgetSheet();
  const thisMonth = jstThisMonth();
  const setMonth = (m: string) => void navigate({ to: "/", search: { month: m === thisMonth ? undefined : m, user: search.user } });
  const setUser = (user: string | undefined) => void navigate({ to: "/", search: { month: search.month, user } });
  // 予算を変えられるのは本人だけ（相手の数字を見ているときは押せない）
  const openBudget = (amount: number | null) => {
    if (isMe) budgetSheet.open(month, amount);
  };

  const header = (
    <header className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[20px] font-bold tracking-tight">COVOW</p>
        <div className="mt-0.5 flex items-center gap-1">
          <CircleIconButton tone={theme.tone.page} icon="chevronLeft" label={t("home.prevMonth")} onClick={() => setMonth(addMonths(month, -1))} />
          <h1 className="num text-[15px] font-semibold">{formatMonth(month, locale)}</h1>
          <CircleIconButton
            tone={theme.tone.page}
            icon="chevronRight"
            label={t("home.nextMonth")}
            onClick={() => setMonth(addMonths(month, 1))}
          />
        </div>
      </div>
      <Link to="/settings" className="flex -space-x-2" aria-label={(space.data?.members ?? []).map((m) => m.displayName).join(", ")}>
        {(space.data?.members ?? []).map((m) => (
          <Avatar key={m.id} name={m.displayName} />
        ))}
      </Link>
    </header>
  );

  let body;
  if (summary.isPending) {
    body = <HomeBodySkeleton />;
  } else if (summary.isError) {
    body = <ErrorMessage tone={theme.tone.page} onRetry={() => void summary.refetch()} />;
  } else {
    const s = summary.data;
    const empty = s.actualTotal === 0 && s.plannedCount === 0;
    const muted = mutedText(theme.tone.hero);
    body = (
      <Reveal active={reveal} className="flex flex-col gap-5">
        <Stale stale={summary.isPlaceholderData} className="flex flex-col gap-5">
          <HeroGlassCard labelledBy="hero-label">
            <p id="hero-label" className={LABEL}>
              {t("home.leftToSpend")}
            </p>
            {s.remaining === null ? (
              <>
                <p className={`mt-3 text-[15px] ${muted}`}>{t("home.noBudget")}</p>
                {isMe && (
                  <PrimaryButton tone={theme.tone.hero} className="mt-3" onClick={() => openBudget(null)}>
                    {t("home.setBudget")}
                  </PrimaryButton>
                )}
              </>
            ) : (
              <>
                <HeroAmount value={s.remaining} />
                <p className={`num mt-1 flex flex-wrap gap-x-3 text-[13px] ${muted}`}>
                  <button type="button" className="whitespace-nowrap underline-offset-4 hover:underline" onClick={() => openBudget(s.budget)}
                    disabled={!isMe}>
                    {t("home.budget")} {formatYen(s.budget ?? 0)}
                  </button>
                  <span className="whitespace-nowrap">
                    {t("home.spent")} {formatYen(s.actualTotal)}
                  </span>
                  <span className="whitespace-nowrap">
                    {t("home.planned")} {formatYen(s.plannedTotal)}
                  </span>
                </p>
              </>
            )}
            <WeekSpend month={month} today={s.today} user={search.user} />
          </HeroGlassCard>

          {s.overBudget && <AttentionNote>{t("attention.overBy", { amount: formatYen(s.overAmount) })}</AttentionNote>}

          <div className="grid grid-cols-2 gap-3">
            <MetricPill
              tone="p1"
              label={t("metric.spent")}
              amount={s.actualTotal}
              ariaLabel={t("metric.spentAria", { amount: formatYen(s.actualTotal) })}
              foot={<DeltaBadge ratio={s.momRatio} />}
              onClick={() => void navigate({ to: "/expenses", search: month === thisMonth ? {} : { month } })}
            />
            <MetricPill
              tone="p2"
              label={t("metric.planned")}
              amount={s.plannedTotal}
              ariaLabel={t("metric.plannedAria", { amount: formatYen(s.plannedTotal), count: s.plannedCount })}
              foot={t("metric.items", { count: s.plannedCount })}
              onClick={() => void navigate({ to: "/plans" })}
            />
            {s.usageRate !== null && s.budget !== null && (
              <div className="col-span-2">
                <UsedBar rate={s.usageRate} used={s.actualTotal + s.plannedTotal} budget={s.budget} />
              </div>
            )}
          </div>

          {s.overdueCount > 0 && (
            <Link to="/plans" className="lg lg-card flex min-h-12 items-center gap-2 rounded-[20px] px-4 py-3 text-[14px] font-medium">
              <Icon name="attention" size={18} className="shrink-0" />
              <span className="flex-1">{t("home.overdue", { count: s.overdueCount })}</span>
              <Icon name="chevronRight" size={16} />
            </Link>
          )}

          <section aria-labelledby="upcoming" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 id="upcoming" className={LABEL}>
                {t("home.upcoming")}
              </h2>
              <Link to="/plans" className={`inline-flex min-h-11 items-center gap-1 ${LABEL}`}>
                {t("home.all")}
                <Icon name="chevronRight" size={14} />
              </Link>
            </div>
            {empty && s.upcoming.length === 0 ? (
              <GlassCard>
                <EmptyState
                  tone={theme.tone.card}
                  icon="plans"
                  title={t("home.noRecords")}
                  body={t("home.noRecordsBody")}
                  action={{ label: t("home.addFirst"), onClick: () => planForm.open() }}
                />
              </GlassCard>
            ) : (
              s.upcoming.map((p) => (
                <Link key={p.id} to="/plans/$planId" params={{ planId: p.id }}>
                  <GlassCard className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.title}</p>
                      <p className={`num text-[12px] ${mutedText(theme.tone.card)}`}>
                        {p.createdByName}
                        {p.plannedDate && ` ・ ${formatShortDate(p.plannedDate, locale)}`}
                      </p>
                    </div>
                    <span className="num shrink-0 text-[15px] font-semibold">{formatYen(p.plannedAmount)}</span>
                  </GlassCard>
                </Link>
              ))
            )}
            <SecondaryButton tone={theme.tone.page} icon="receipt" className="mt-1 self-start" onClick={() => expenseForm.open()}>
              {t("expense.add")}
            </SecondaryButton>
          </section>
        </Stale>
      </Reveal>
    );
  }

  return (
    <main className="app-shell flex flex-col gap-5">
      {header}
      <PersonSwitch value={view} onChange={setUser} />
      <TourOffer />
      {body}
      <div
        data-fixed-overlay
        data-tour="add-plan"
        className="rounded-full fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px+var(--coach-h,0px))] z-30"
      >
        <AddPill onClick={() => planForm.open()} />
      </div>
      {planForm.element}
      {expenseForm.element}
      {budgetSheet.element}
    </main>
  );
}

/**
 * 初期設定を終えた人に、一度だけ「Let's Try」を勧めるカード（案内は日本語だけ）。
 * 体験版の人には最初からコーチが出るので、ここでは出さない。
 */
function TourOffer() {
  const { data: me } = useQuery(meQuery);
  const tour = useTour();
  const [offered, setOffered] = useState(() => {
    try {
      return !!me && localStorage.getItem(offerKey(me.user.id)) === "1";
    } catch {
      return false;
    }
  });
  if (!me || me.user.isGuest || !offered || tour.state.open) return null;
  const dismiss = () => {
    try {
      localStorage.removeItem(offerKey(me.user.id));
    } catch {
      // 消せなくても、この画面の間は閉じる
    }
    setOffered(false);
  };
  return (
    <section lang="ja" aria-label="Let's Try" className="overlay-glass-dark flex flex-col gap-2 rounded-[24px] px-4 py-4 text-white">
      <p className="text-[17px] font-semibold">Let's Try（約3分）</p>
      <p className="text-[14px] leading-relaxed text-white/90">{phrase("登録から購入済みにするまでの基本操作を、実際の画面で順に案内します。")}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            tour.reset();
          }}
          className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#111827]"
        >
          始める
        </button>
        <button type="button" onClick={dismiss} className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 text-[14px] font-semibold">
          今はしない
        </button>
      </div>
    </section>
  );
}

/** 週の日ごとの支出（曲線・曜日のチップ・週の切り替え）。今月なら今日を含む週、ほかの月はその月の1日を含む週から */
function WeekSpend({ month, today, user }: { month: string; today: string; user?: string }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const tone = theme.tone.hero;
  const initial = weekStartOf(yearMonthOf(today) === month ? today : `${month}-01`);
  const [start, setStart] = useState(initial);
  const dates = weekDates(start);
  const todayIndex = dates.indexOf(today);
  const [sel, setSel] = useState(todayIndex >= 0 ? todayIndex : 0);
  // 月を切り替えたら、その月の週に戻す（作り直さずに切り替えると、新しい週の数字が届くまで前の曲線を残せる）
  const [forMonth, setForMonth] = useState(month);
  if (forMonth !== month) {
    const firstIndex = weekDates(initial).indexOf(today);
    setForMonth(month);
    setStart(initial);
    setSel(firstIndex >= 0 ? firstIndex : 0);
  }
  const daily = useQuery(dailyQuery(dates[0]!, dates[6]!, user));
  // 新しい週の数字を待つ間は、前の週の形を（日付ではなく曜日の順で）薄く残す
  const prev = daily.isPlaceholderData ? [...(daily.data ?? [])].sort((x, y) => (x.date < y.date ? -1 : 1)) : null;
  const amounts = dates.map((d, i) => (prev ? prev[i]?.amount : daily.data?.find((x) => x.date === d)?.amount) ?? 0);
  const peak = amounts.indexOf(Math.max(...amounts));
  const avg = Math.round(amounts.reduce((a, b) => a + b, 0) / 7);
  const latest = weekStartOf(today);

  return (
    <>
      <div className={`mt-4 transition-opacity duration-200 ${daily.isPlaceholderData ? "opacity-55" : ""}`}>
        {/* 最初の読み込みの間は、曲線と同じ高さの仮の形（0円の線が一瞬出て跳ね上がるのを防ぐ） */}
        {daily.isPending ? (
          <Skeleton tone={tone} className="h-[132px] w-full" />
        ) : (
          <SpendCurve
            points={dates.map((date, i) => ({ key: date, amount: amounts[i] ?? 0 }))}
            selectedIndex={sel}
            baseline={{ value: avg, label: t("home.avgPerDay") }}
            summary={t("home.weekPeak", { weekday: weekdayName(peak, textLocale(locale)), amount: formatYen(amounts[peak] ?? 0) })}
          />
        )}
      </div>
      <div className="mt-3" data-tour="day-chips">
        <DayChips
          tone={tone}
          dates={dates}
          amounts={amounts}
          selectedIndex={sel}
          onSelect={(i) => {
            setSel(i);
            tourEvent("day-selected");
          }}
          today={today}
        />
      </div>
      <div className="mt-3">
        <WeekNavigator
          tone={tone}
          start={dates[0]!}
          end={dates[6]!}
          onPrev={() => setStart(addDays(start, -7))}
          onNext={() => setStart(addDays(start, 7))}
          nextDisabled={start >= latest}
        />
      </div>
    </>
  );
}
