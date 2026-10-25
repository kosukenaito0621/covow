import { useEffect, useState, type ReactNode } from "react";
import { addDays, weekDates, weekStartOf } from "@shared/date/jst";
import { formatMonth, formatShortDate, LOCALES, weekdayName, type Locale } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { CategoryBars } from "../components/charts/CategoryBars";
import { DayChips } from "../components/charts/DayChips";
import { SpendCurve } from "../components/charts/SpendCurve";
import { WeekNavigator } from "../components/charts/WeekNavigator";
import { AddPill } from "../components/glass/AddPill";
import { ConfirmDialog } from "../components/glass/ConfirmDialog";
import { DeltaBadge } from "../components/glass/DeltaBadge";
import { FloatingNav } from "../components/glass/FloatingNav";
import { GlassCard } from "../components/glass/GlassCard";
import { GlassSheet } from "../components/glass/GlassSheet";
import { HeroGlassCard } from "../components/glass/HeroGlassCard";
import { MetricPill } from "../components/glass/MetricPill";
import { TabChips } from "../components/glass/TabChips";
import { UsedBar } from "../components/glass/UsedBar";
import { CategoryBadge, DemoDataBanner, FromPlanBadge, StatusBadge } from "../components/ui/Badges";
import { CircleIconButton, PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../components/ui/FormField";
import { HeroAmount } from "../components/ui/HeroAmount";
import { Icon } from "../components/ui/Icon";
import { AttentionNote, EmptyState, ErrorMessage, LoadingSkeleton, Skeleton } from "../components/ui/States";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import { THEME_IDS, THEMES, type ThemeId } from "../theme/themes";

/*
 * 部品の確認用ページ（開発環境だけ）。数字はすべてサンプル。
 * 上のつまみでテーマと言語を切り替える。?theme=frost&lang=ja&state=empty|loading|error|long&view=parts&used=1.15 でも指定できる。
 */

const TODAY = "2026-10-25";
const SAMPLE_WEEK = [3_200, 8_200, 0, 1_480, 5_600, 12_900, 2_300];
const SAMPLE = { budget: 180_000, actual: 63_480, planned: 41_200, plannedCount: 3 };
// ?state=long：8桁の金額で崩れないかを見る
const LONG = { budget: 99_999_999, actual: 12_345_678, planned: 9_876_543, plannedCount: 12 };
const UPCOMING = [
  { t: "ダイニングチェア（2脚）", a: 28_000, who: "Aoi", d: "2026-10-27" },
  { t: "加湿器", a: 9_800, who: "Haru", d: "2026-10-29" },
  { t: "冬用のラグ", a: 3_400, who: "Aoi", d: "2026-11-02" },
];

type View = "home" | "parts";

const LABEL = "text-[12px] leading-none font-semibold tracking-[0.08em] uppercase";

export default function ComponentGallery() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state") ?? "data";
  const [view, setView] = useState<View>(params.get("view") === "parts" ? "parts" : "home");
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useT();

  // URL で指定されたテーマと言語に一度だけ合わせる（スクリーンショット用）
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const th = q.get("theme");
    const lang = q.get("lang");
    if (th && (THEME_IDS as readonly string[]).includes(th)) setTheme(th as ThemeId);
    if (lang && (LOCALES as readonly string[]).includes(lang)) setLocale(lang as Locale);
  }, [setTheme, setLocale]);

  return (
    <>
      <DemoDataBanner />
      <main className="app-shell flex flex-col gap-5">
        <div className="flex flex-col gap-2" data-dev-toolbar>
          <TabChips
            label="Theme"
            value={theme.id}
            onChange={setTheme}
            tone={theme.tone.page}
            options={THEME_IDS.map((id) => ({ value: id, label: THEMES[id].label }))}
          />
          <div className="flex gap-2">
            <TabChips
              label="Language"
              value={locale}
              onChange={setLocale}
              tone={theme.tone.page}
              options={[
                { value: "en", label: "English" },
                { value: "ja", label: "日本語" },
                { value: "mix", label: "Mix" },
              ]}
            />
            <TabChips
              label="View"
              value={view}
              onChange={setView}
              tone={theme.tone.page}
              options={[
                { value: "home", label: "Home" },
                { value: "parts", label: "Parts" },
              ]}
            />
          </div>
        </div>
        {view === "home" ? <HomePreview state={state} usedParam={Number(params.get("used"))} /> : <PartsPreview />}
      </main>
      <FloatingNav currentPath="/" />
    </>
  );
}

function HomeHeader() {
  const { t, locale } = useT();
  const { theme } = useTheme();
  return (
    <header className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[20px] font-bold tracking-tight">COVOW</p>
        <div className="mt-0.5 flex items-center gap-1">
          <CircleIconButton tone={theme.tone.page} icon="chevronLeft" label={t("home.prevMonth")} />
          <h1 className="num text-[15px] font-semibold">{formatMonth("2026-10", locale)}</h1>
          <CircleIconButton tone={theme.tone.page} icon="chevronRight" label={t("home.nextMonth")} />
        </div>
      </div>
      <div className="flex -space-x-2 text-[#1f2937]" aria-label="Aoi, Haru">
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">A</span>
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">H</span>
      </div>
    </header>
  );
}

function HomePreview({ state, usedParam }: { state: string; usedParam: number }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const tone = theme.tone.hero;
  const muted = tone === "light" ? "text-ink-muted" : "text-white/90";
  const thisWeek = weekStartOf(TODAY);
  const [start, setStart] = useState(thisWeek);
  const [sel, setSel] = useState(6);
  const [sheet, setSheet] = useState(false);
  const dates = weekDates(start);
  const amounts = start === thisWeek ? SAMPLE_WEEK : SAMPLE_WEEK.map((a) => Math.round(a * 0.7));
  const d = state === "long" ? LONG : SAMPLE;
  const remaining = d.budget - d.actual - d.planned;
  const rate = usedParam > 0 ? usedParam : (d.actual + d.planned) / d.budget;
  const peak = amounts.indexOf(Math.max(...amounts));

  if (state === "loading") {
    return (
      <>
        <HomeHeader />
        <LoadingSkeleton>
          <div className="lg lg-hero flex flex-col gap-3 rounded-[32px] p-5">
            <Skeleton tone={tone} className="h-4 w-40" />
            <Skeleton tone={tone} className="h-12 w-56" />
            <Skeleton tone={tone} className="h-3 w-64" />
            <Skeleton tone={tone} className="mt-4 h-28 w-full" />
            <Skeleton tone={tone} className="h-11 w-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Skeleton className="h-[112px] rounded-full" />
            <Skeleton className="h-[112px] rounded-full" />
            <Skeleton className="col-span-2 h-[84px] rounded-full" />
          </div>
        </LoadingSkeleton>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        <HomeHeader />
        <ErrorMessage onRetry={() => undefined} />
      </>
    );
  }
  if (state === "empty") {
    return (
      <>
        <HomeHeader />
        <HeroGlassCard labelledBy="hero-label">
          <p id="hero-label" className={LABEL}>
            {t("home.leftToSpend")}
          </p>
          <PrimaryButton tone={tone} className="mt-3">
            {t("home.setBudget")}
          </PrimaryButton>
          <div className="mt-6 rounded-[24px] border border-current/15">
            <EmptyState tone={tone} icon="chart" title={t("home.noRecords")} body={t("home.noRecordsBody")} />
          </div>
        </HeroGlassCard>
        <div className="flex justify-center">
          <PrimaryButton tone={theme.tone.page} icon="plus">
            {t("home.addFirst")}
          </PrimaryButton>
        </div>
      </>
    );
  }

  return (
    <>
      <HomeHeader />
      <HeroGlassCard labelledBy="hero-label">
        <div className="flex items-center justify-between gap-3">
          <p id="hero-label" className={LABEL}>
            {t("home.leftToSpend")}
          </p>
          <CircleIconButton tone={tone} icon="arrowUpRight" label={t("nav.insights")} />
        </div>
        <HeroAmount value={remaining} />
        <p className={`num mt-1 flex flex-wrap gap-x-3 text-[13px] ${muted}`}>
          <span className="whitespace-nowrap">
            {t("home.budget")} {formatYen(d.budget)}
          </span>
          <span className="whitespace-nowrap">
            {t("home.spent")} {formatYen(d.actual)}
          </span>
          <span className="whitespace-nowrap">
            {t("home.planned")} {formatYen(d.planned)}
          </span>
        </p>
        <div className="mt-4">
          <SpendCurve
            points={dates.map((date, i) => ({ key: date, amount: amounts[i] ?? 0 }))}
            selectedIndex={sel}
            baseline={{ value: Math.round(amounts.reduce((a, b) => a + b, 0) / 7), label: t("home.avgPerDay") }}
            summary={t("home.weekPeak", { weekday: weekdayName(peak, locale), amount: formatYen(amounts[peak] ?? 0) })}
          />
        </div>
        <div className="mt-3">
          <DayChips tone={tone} dates={dates} amounts={amounts} selectedIndex={sel} onSelect={setSel} today={TODAY} />
        </div>
        <div className="mt-3">
          <WeekNavigator
            tone={tone}
            start={dates[0]!}
            end={dates[6]!}
            onPrev={() => setStart(addDays(start, -7))}
            onNext={() => setStart(addDays(start, 7))}
            nextDisabled={start >= thisWeek}
          />
        </div>
      </HeroGlassCard>

      <div className="grid grid-cols-2 gap-3">
        <MetricPill
          tone="p1"
          label={t("metric.spent")}
          amount={d.actual}
          ariaLabel={`${t("metric.spentAria", { amount: formatYen(d.actual) })}. ${t("delta.up", { percent: 12 })}`}
          foot={<DeltaBadge ratio={0.12} />}
          onClick={() => undefined}
        />
        <MetricPill
          tone="p2"
          label={t("metric.planned")}
          amount={d.planned}
          ariaLabel={t("metric.plannedAria", { amount: formatYen(d.planned), count: d.plannedCount })}
          foot={t("metric.items", { count: d.plannedCount })}
          onClick={() => undefined}
        />
        <div className="col-span-2">
          <UsedBar rate={rate} used={Math.round(d.budget * rate)} budget={d.budget} />
        </div>
      </div>

      <section aria-labelledby="upcoming" className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 id="upcoming" className={LABEL}>
            {t("home.upcoming")}
          </h2>
          <a href="#" className={`inline-flex min-h-11 items-center gap-1 ${LABEL}`}>
            {t("home.all")}
            <Icon name="chevronRight" size={14} />
          </a>
        </div>
        {UPCOMING.map((p) => (
          <GlassCard key={p.t} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.t}</p>
              <p className={`num text-[12px] ${theme.tone.card === "light" ? "text-ink-muted" : "text-white/90"}`}>
                {p.who} ・ {formatShortDate(p.d, locale)}
              </p>
            </div>
            <span className="num shrink-0 text-[15px] font-semibold">{formatYen(p.a)}</span>
          </GlassCard>
        ))}
      </section>

      <div
        data-fixed-overlay
        className="fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px)] z-30"
      >
        <AddPill onClick={() => setSheet(true)} />
      </div>

      <GlassSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("plan.add")}
        footer={
          <div className="flex flex-col gap-3">
            <p className="num flex items-center justify-between text-[14px]">
              <span className="text-white/90">{formatYen(remaining)}</span>
              <span className="font-semibold">→ {formatYen(remaining - 128_400)}</span>
            </p>
            <PrimaryButton tone="dark" fullWidth>
              {t("plan.add")}
            </PrimaryButton>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="商品名 / Item" required>
            {(p) => <TextInput {...p} defaultValue="ソファ" />}
          </FormField>
          <FormField label="予定金額 / Amount" required>
            {(p) => <AmountInput {...p} defaultValue="128,400" />}
          </FormField>
          <AttentionNote tone="dark">{t("attention.overBudgetConfirm")}</AttentionNote>
        </div>
      </GlassSheet>
    </>
  );
}

function PartsPreview() {
  const { t } = useT();
  const { theme } = useTheme();
  const [tab, setTab] = useState<"all" | "planned" | "purchased" | "canceled">("all");
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Section title="TabChips">
        <TabChips
          label="Filter"
          value={tab}
          onChange={setTab}
          tone={theme.tone.page}
          options={[
            { value: "all", label: t("home.all") },
            { value: "planned", label: t("status.planned") },
            { value: "purchased", label: t("status.purchased") },
            { value: "canceled", label: t("status.canceled") },
          ]}
        />
      </Section>

      <Section title="MetricPill / UsedBar">
        <div className="grid grid-cols-2 gap-3">
          {[9_800, 99_999_999].map((v) => (
            <MetricPill key={v} tone="p1" label={t("metric.spent")} amount={v} ariaLabel={formatYen(v)} foot={<DeltaBadge ratio={-0.03} />} />
          ))}
          <MetricPill tone="p2" label={t("metric.planned")} amount={12_345_678} ariaLabel={formatYen(12_345_678)} foot={t("metric.items", { count: 12 })} />
          <MetricPill tone="p2" label={t("metric.planned")} amount={0} ariaLabel={formatYen(0)} foot={<DeltaBadge ratio={null} />} />
          <div className="col-span-2 flex flex-col gap-3">
            <UsedBar rate={0.05} used={9_000} budget={180_000} />
            <UsedBar rate={1.15} used={207_000} budget={180_000} />
          </div>
        </div>
      </Section>

      <Section title="HeroAmount">
        <HeroGlassCard>
          {[1, 1_234, 123_456, 12_345_678, 99_999_999, -15_000].map((v) => (
            <HeroAmount key={v} value={v} />
          ))}
        </HeroGlassCard>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status="planned" />
          <StatusBadge status="purchased" />
          <StatusBadge status="canceled" />
          <CategoryBadge name="家具・家電" />
          <CategoryBadge name={null} />
          <FromPlanBadge />
          <DeltaBadge ratio={0.01} />
          <DeltaBadge ratio={-0.12} />
          <DeltaBadge ratio={0} />
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton tone={theme.tone.page} icon="check">
            {t("status.purchased")}
          </PrimaryButton>
          <SecondaryButton tone={theme.tone.page} icon="edit">
            Edit
          </SecondaryButton>
          <PrimaryButton tone={theme.tone.page} loading>
            Saving
          </PrimaryButton>
          <CircleIconButton tone={theme.tone.page} icon="info" label="Help" />
          <AddPill onClick={() => setConfirm(true)} />
        </div>
      </Section>

      <Section title="CategoryBars">
        <HeroGlassCard>
          <CategoryBars
            rows={[
              { key: "food", name: "食費", amount: 32_400, ratio: 0.51 },
              { key: "home", name: "家具・家電", amount: 18_000, ratio: 0.28 },
              { key: "none", name: t("badge.uncategorized"), amount: 4_600, ratio: 0.08 },
            ]}
          />
        </HeroGlassCard>
      </Section>

      <Section title="Empty / Error / Attention">
        <GlassCard>
          <EmptyState
            tone={theme.tone.card}
            title={t("home.noRecords")}
            body={t("home.noRecordsBody")}
            action={{ label: t("plan.add"), onClick: () => undefined }}
          />
        </GlassCard>
        <ErrorMessage message={t("common.saveError")} onRetry={() => undefined} />
        <AttentionNote>{t("attention.overBy", { amount: formatYen(15_000) })}</AttentionNote>
      </Section>

      <ConfirmDialog
        open={confirm}
        title="Delete this plan?"
        body="Expense records stay (only the link is removed)."
        confirmLabel="Delete"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className={LABEL}>{title}</h2>
      {children}
    </section>
  );
}
