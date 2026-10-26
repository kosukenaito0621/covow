import { motion } from "motion/react";
import { useState } from "react";
import type { IsoDate, YearMonth } from "@shared/date/jst";
import { formatMonth, formatMonthShort, formatShortDate, textLocale } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { CategoryBars } from "../components/charts/CategoryBars";
import { MonthlyBars } from "../components/charts/MonthlyBars";
import { SpendCurve } from "../components/charts/SpendCurve";
import { DeltaBadge } from "../components/glass/DeltaBadge";
import { GlassCard } from "../components/glass/GlassCard";
import { HeroGlassCard } from "../components/glass/HeroGlassCard";
import { TabChips } from "../components/glass/TabChips";
import { UsedBar } from "../components/glass/UsedBar";
import { Avatar } from "../components/ui/Avatar";
import { CircleIconButton } from "../components/ui/Buttons";
import { HeroAmount } from "../components/ui/HeroAmount";
import { LABEL, mutedText, SectionLabel } from "../components/ui/SectionLabel";
import { EmptyState } from "../components/ui/States";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

export type InsightsTab = "overview" | "category" | "trend" | "members";

/** 分析の画面に出す値。集計はすべて shared/money の関数で済ませてから渡す */
export interface InsightsData {
  yearMonth: YearMonth;
  actual: number;
  budget: number | null;
  /** 予算の使用率（実支出＋予定額）。予算なしなら null */
  usageRate: number | null;
  used: number;
  /** 先月の同じ日までとの増減率。先月が0円なら null */
  momRatio: number | null;
  planVsActual: { count: number; plannedTotal: number; actualTotal: number; diff: number };
  daily: readonly { date: IsoDate; amount: number }[];
  /** 日ごとのグラフで最初に選んでおく日（今日など） */
  dailySelected: number;
  categories: readonly { key: string; name: string; amount: number; ratio: number }[];
  categoryTotal: number;
  trend: readonly { yearMonth: YearMonth; actual: number; budget: number | null }[];
  /** 終わった月の平均（途中の月は除く）。終わった月がなければ null */
  trendAverage: number | null;
  trendOverCount: number;
  /** id が null のものは退出したメンバーのまとめ */
  members: readonly { id: string | null; name: string; amount: number; ratio: number; planCount: number }[];
}

export function InsightsScreen({
  data: d,
  initialTab = "overview",
  onPrevMonth,
  onNextMonth,
  nextDisabled,
  showMembers = true,
  onTabChange,
}: {
  data: InsightsData;
  initialTab?: InsightsTab;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  nextDisabled?: boolean;
  /** メンバー別のタブを出すか（一人のときは出さない） */
  showMembers?: boolean;
  onTabChange?: (tab: InsightsTab) => void;
}) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const [tab, setTab] = useState<InsightsTab>(initialTab);
  const tabs: InsightsTab[] = showMembers ? ["overview", "category", "trend", "members"] : ["overview", "category", "trend"];
  // タブを切り替えたときだけ、中身を浮かび上がらせる（最初の表示は画面全体のブラーアップに任せる）
  const [switched, setSwitched] = useState(false);
  const changeTab = (v: InsightsTab) => {
    setTab(v);
    setSwitched(true);
    onTabChange?.(v);
  };

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{t("insights.title")}</h1>
        <div className="-ml-1 flex items-center gap-1">
          <CircleIconButton tone={theme.tone.page} icon="chevronLeft" label={t("home.prevMonth")} onClick={onPrevMonth} />
          <p className="num text-[15px] font-semibold">{formatMonth(d.yearMonth, locale)}</p>
          <CircleIconButton
            tone={theme.tone.page}
            icon="chevronRight"
            label={t("home.nextMonth")}
            onClick={onNextMonth}
            disabled={nextDisabled}
            className="disabled:opacity-40"
          />
        </div>
      </header>

      <div data-tour="insights-tabs">
        <TabChips
          label={t("insights.view")}
          value={tab}
          onChange={changeTab}
          tone={theme.tone.page}
          idPrefix="insights"
          options={tabs.map((v) => ({ value: v, label: t(`insights.${v}`) }))}
        />
      </div>

      {/* 親に opacity を付けるとガラスのぼかしが消えるので、動きは .reveal（ガラスの面ごと）で付ける */}
      <div
        key={tab}
        id="insights-panel"
        role="tabpanel"
        aria-labelledby={`insights-tab-${tab}`}
        className={`flex flex-col gap-4 ${switched ? "reveal" : ""}`}
      >
        {tab === "overview" && <Overview d={d} />}
        {tab === "category" && <Category d={d} />}
        {tab === "trend" && <Trend d={d} />}
        {tab === "members" && <Members d={d} />}
      </div>
    </>
  );

}

function Overview({ d }: { d: InsightsData }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const heroMuted = mutedText(theme.tone.hero);
  const cardMuted = mutedText(theme.tone.card);
  const [sel, setSel] = useState(d.dailySelected);
  const peak = d.daily.reduce((best, x, i) => (x.amount > (d.daily[best]?.amount ?? 0) ? i : best), 0);
  const pva = d.planVsActual;
  return (
    <>
      <HeroGlassCard labelledBy="ov-label">
        <div className="flex items-center justify-between gap-3">
          <p id="ov-label" className={LABEL}>
            {t("metric.spent")}
          </p>
          <span className="flex items-center gap-1.5 text-[12px] font-medium">
            <DeltaBadge ratio={d.momRatio} />
            <span className={heroMuted}>{t("insights.vsLastMonth")}</span>
          </span>
        </div>
        <HeroAmount value={d.actual} />
        {d.budget !== null && (
          <p className={`num mt-1 text-[13px] ${heroMuted}`}>
            {t("home.budget")} {formatYen(d.budget)}
          </p>
        )}
        <div className="mt-5">
          <SectionLabel as="p">{t("insights.daily")}</SectionLabel>
          <div className="mt-2">
            <SpendCurve
              points={d.daily.map((x) => ({ key: x.date, amount: x.amount }))}
              selectedIndex={sel}
              summary={t("insights.dailySummary", {
                date: formatShortDate(d.daily[peak]?.date ?? d.yearMonth, textLocale(locale)),
                amount: formatYen(d.daily[peak]?.amount ?? 0),
              })}
            />
          </div>
          <input
            type="range"
            min={0}
            max={d.daily.length - 1}
            value={sel}
            onChange={(e) => setSel(Number(e.target.value))}
            aria-label={t("week.pickDay")}
            aria-valuetext={`${formatShortDate(d.daily[sel]?.date ?? "", locale)} ${formatYen(d.daily[sel]?.amount ?? 0)}`}
            className="mt-1 w-full accent-current"
          />
          <div className={`num flex justify-between text-[12px] ${heroMuted}`}>
            <span>{formatShortDate(d.daily[0]?.date ?? "", locale)}</span>
            <span>{formatShortDate(d.daily[d.daily.length - 1]?.date ?? "", locale)}</span>
          </div>
        </div>
      </HeroGlassCard>

      {d.usageRate !== null && d.budget !== null && <UsedBar rate={d.usageRate} used={d.used} budget={d.budget} />}

      <GlassCard className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <SectionLabel as="h2">{t("insights.planVsActual")}</SectionLabel>
          <span className={`text-[12px] ${cardMuted}`}>{t("insights.boughtFromPlans", { count: pva.count })}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={`text-[12px] ${cardMuted}`}>{t("insights.plannedTotal")}</p>
            <p className="num text-[20px] font-semibold">{formatYen(pva.plannedTotal)}</p>
          </div>
          <div>
            <p className={`text-[12px] ${cardMuted}`}>{t("insights.paidTotal")}</p>
            <p className="num text-[20px] font-semibold">{formatYen(pva.actualTotal)}</p>
          </div>
        </div>
        <p className="num text-[14px] font-semibold">
          {pva.diff === 0
            ? t("plan.same")
            : pva.diff < 0
              ? t("plan.under", { amount: formatYen(-pva.diff) })
              : t("plan.over", { amount: formatYen(pva.diff) })}
        </p>
      </GlassCard>
    </>
  );
}

function Category({ d }: { d: InsightsData }) {
  const { t } = useT();
  const { theme } = useTheme();
  return (
    <HeroGlassCard labelledBy="cat-label">
      <p id="cat-label" className={LABEL}>
        {t("insights.total")}
      </p>
      <HeroAmount value={d.categoryTotal} />
      <div className="mt-5">
        {d.categories.length === 0 ? (
          <EmptyState tone={theme.tone.hero} icon="chart" title={t("home.noRecords")} />
        ) : (
          <CategoryBars rows={d.categories} />
        )}
      </div>
    </HeroGlassCard>
  );
}

function Trend({ d }: { d: InsightsData }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const heroMuted = mutedText(theme.tone.hero);
  return (
    <HeroGlassCard labelledBy="trend-label">
      <p id="trend-label" className={LABEL}>
        {t("insights.average")}
      </p>
      {d.trendAverage !== null && <HeroAmount value={d.trendAverage} />}
      <p className={`mt-1 text-[13px] ${heroMuted}`}>{t("insights.trendSummary", { months: d.trend.length, count: d.trendOverCount })}</p>
      <div className="mt-6">
        <MonthlyBars
          bars={d.trend.map((m) => ({ key: m.yearMonth, label: formatMonthShort(m.yearMonth, locale), actual: m.actual, budget: m.budget }))}
          selectedKey={d.yearMonth}
          summary={d.trend
            .map((m) => `${formatMonth(m.yearMonth, locale)} ${formatYen(m.actual)}${m.budget !== null ? ` / ${formatYen(m.budget)}` : ""}`)
            .join(", ")}
        />
      </div>
    </HeroGlassCard>
  );
}

function Members({ d }: { d: InsightsData }) {
  const { t } = useT();
  const { theme } = useTheme();
  const cardMuted = mutedText(theme.tone.card);
  return (
    <ul className="flex flex-col gap-2.5">
      {d.members.map((m) => {
        const name = m.id === null ? t("insights.formerMember") : m.name;
        return (
          <li key={m.id ?? "former"}>
            <GlassCard className="flex items-center gap-3 px-4 py-3">
              <Avatar name={name} former={m.id === null} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[15px] font-semibold">{name}</p>
                  <p className="num shrink-0 text-[15px] font-semibold">{formatYen(m.amount)}</p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-current/12" aria-hidden="true">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-cyan to-lavender"
                    initial={{ width: 0 }}
                    animate={{ width: `${m.ratio * 100}%` }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className={`num mt-1 flex justify-between text-[12px] ${cardMuted}`}>
                  <span>{t("insights.plansAdded", { count: m.planCount })}</span>
                  <span>{Math.round(m.ratio * 100)}%</span>
                </p>
              </div>
            </GlassCard>
          </li>
        );
      })}
    </ul>
  );
}

