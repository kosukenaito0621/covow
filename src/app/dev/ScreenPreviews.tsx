import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, daysInMonth, type IsoDate, yearMonthOf } from "@shared/date/jst";
import { INVITE_TTL_HOURS } from "@shared/constants";
import { LOCALES, type Locale } from "@shared/i18n";
import { categoryBreakdown, dailySpend, memberBreakdown, monthlyTrend, planVsActual, trendStats } from "@shared/money/analytics";
import { type ExpenseLike, monthOverMonth, type PlanLike, remainingAfterPlanChange, summarizeMonth } from "@shared/money/summary";
import { FloatingNav } from "../components/glass/FloatingNav";
import { TabChips } from "../components/glass/TabChips";
import { DemoDataBanner } from "../components/ui/Badges";
import { useT } from "../i18n/I18nProvider";
import { InsightsScreen, type InsightsTab } from "../screens/InsightsScreen";
import { PlanDetailScreen } from "../screens/PlanDetailScreen";
import { PlansScreen } from "../screens/PlansScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { PlanView } from "../screens/types";
import { useTheme } from "../theme/ThemeProvider";
import { THEME_IDS, THEMES, type ThemeId } from "../theme/themes";

/*
 * 予定・分析・設定の画面の見た目を確かめるページ（開発環境だけ）。数字はすべてサンプル。
 * ?screen=plans|plan|insights|settings&theme=&lang=&tab=overview|category|trend|members&plan=<id>&state=empty
 * 集計は本番と同じ shared/money の関数で行う。
 */

const TODAY: IsoDate = "2026-10-25";
const YM = yearMonthOf(TODAY);
const ME = "u-aoi";
const HARU = "u-haru";
const NAMES: Record<string, string> = { [ME]: "Aoi", [HARU]: "Haru" };

const CATS = [
  { id: "c-food", en: "Groceries", ja: "食費" },
  { id: "c-home", en: "Home", ja: "家具・家電" },
  { id: "c-daily", en: "Daily goods", ja: "日用品" },
  { id: "c-fun", en: "Going out", ja: "おでかけ" },
  { id: "c-gift", en: "Gifts", ja: "プレゼント" },
];

type Raw = Omit<PlanView, "createdBy" | "category" | "title" | "memo"> & {
  en: string;
  ja: string;
  by: string;
  cat: string | null;
  memo?: { en: string; ja: string };
};

const RAW_PLANS: Raw[] = [
  { id: "p1", en: "Dining chairs (pair)", ja: "ダイニングチェア（2脚）", plannedAmount: 28_000, plannedDate: "2026-10-27", status: "planned", by: ME, cat: "c-home", url: "https://example.com/chairs", memo: { en: "Oak, the lighter finish. Check the seat height first.", ja: "オーク材の明るい色。座面の高さを先に確認" } },
  { id: "p2", en: "Humidifier", ja: "加湿器", plannedAmount: 9_800, plannedDate: "2026-10-29", status: "planned", by: HARU, cat: "c-home" },
  { id: "p3", en: "Winter rug", ja: "冬用のラグ", plannedAmount: 3_400, plannedDate: "2026-11-02", status: "planned", by: ME, cat: "c-home" },
  { id: "p4", en: "Rice cooker", ja: "炊飯器", plannedAmount: 24_800, plannedDate: "2026-10-18", status: "planned", by: HARU, cat: "c-home" },
  { id: "p5", en: "Birthday gift for Mom", ja: "母の誕生日プレゼント", plannedAmount: 8_000, plannedDate: null, status: "planned", by: ME, cat: "c-gift" },
  { id: "p6", en: "Coffee grinder", ja: "コーヒーミル", plannedAmount: 12_000, plannedDate: "2026-10-12", status: "purchased", by: HARU, cat: "c-daily", purchase: { amount: 10_780, date: "2026-10-14" } },
  { id: "p7", en: "Concert tickets", ja: "ライブのチケット", plannedAmount: 17_600, plannedDate: "2026-10-05", status: "purchased", by: ME, cat: "c-fun", purchase: { amount: 17_600, date: "2026-10-05" } },
  { id: "p8", en: "Bookshelf", ja: "本棚", plannedAmount: 15_000, plannedDate: "2026-10-09", status: "purchased", by: ME, cat: "c-home", purchase: { amount: 16_480, date: "2026-10-10" } },
  { id: "p9", en: "Second monitor", ja: "サブモニター", plannedAmount: 32_000, plannedDate: "2026-10-20", status: "canceled", by: HARU, cat: "c-home" },
];

const BUDGETS = [
  { yearMonth: "2026-05", budgetAmount: 180_000 },
  { yearMonth: "2026-06", budgetAmount: 180_000 },
  { yearMonth: "2026-07", budgetAmount: 200_000 },
  { yearMonth: "2026-08", budgetAmount: 200_000 },
  { yearMonth: "2026-09", budgetAmount: 180_000 },
  { yearMonth: "2026-10", budgetAmount: 180_000 },
  { yearMonth: "2026-11", budgetAmount: 180_000 },
];

// 決まった並びの「乱数」で、毎回同じサンプルの支出を作る
function sampleExpenses(): ExpenseLike[] {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const out: ExpenseLike[] = [];
  const totals: Record<string, number> = { "2026-05": 151_000, "2026-06": 172_000, "2026-07": 214_000, "2026-08": 188_000, "2026-09": 166_000 };
  for (const [ym, total] of Object.entries(totals)) {
    const n = 18;
    for (let i = 0; i < n; i++) {
      out.push({
        id: `e-${ym}-${i}`,
        actualAmount: Math.round(total / n),
        spentAt: `${ym}-${String(1 + ((i * 7) % daysInMonth(ym))).padStart(2, "0")}`,
        purchasePlanId: null,
        categoryId: CATS[i % CATS.length]!.id,
        recordedBy: i % 3 === 0 ? HARU : ME,
      });
    }
  }
  // 今月：今日までの日ごとに、食費・日用品などの小さな支出
  for (let day = 1; day <= Number(TODAY.slice(8)); day++) {
    const date = `${YM}-${String(day).padStart(2, "0")}`;
    if (rnd() < 0.3) continue;
    out.push({
      id: `e-now-${day}`,
      actualAmount: Math.round((800 + rnd() * 4_200) / 10) * 10,
      spentAt: date,
      purchasePlanId: null,
      categoryId: rnd() < 0.6 ? "c-food" : rnd() < 0.5 ? "c-daily" : rnd() < 0.5 ? null : "c-fun",
      recordedBy: rnd() < 0.55 ? ME : HARU,
    });
  }
  // 退出したメンバーが記録した支出（「退出したメンバー」にまとまる）
  out.push({ id: "e-old", actualAmount: 2_400, spentAt: "2026-10-03", purchasePlanId: null, categoryId: "c-food", recordedBy: "u-left" });
  // 予定から買ったもの
  for (const p of RAW_PLANS) {
    if (p.purchase) {
      out.push({ id: `e-${p.id}`, actualAmount: p.purchase.amount, spentAt: p.purchase.date, purchasePlanId: p.id, categoryId: p.cat, recordedBy: p.by });
    }
  }
  return out;
}

const expenses = sampleExpenses();
const planLikes: PlanLike[] = RAW_PLANS.map((r) => ({
  id: r.id,
  plannedAmount: r.plannedAmount,
  plannedDate: r.plannedDate,
  createdAt: "2026-10-01T00:00:00.000Z",
  status: r.status,
  createdBy: r.by,
}));
const budgetOf = (ym: string) => BUDGETS.find((b) => b.yearMonth === ym)?.budgetAmount ?? null;
const summary = summarizeMonth({ yearMonth: YM, budget: budgetOf(YM), plans: planLikes, expenses });

type Screen = "plans" | "plan" | "insights" | "settings";
const SCREENS: Screen[] = ["plans", "plan", "insights", "settings"];
const NAV_PATH: Record<Screen, string> = { plans: "/plans", plan: "/plans", insights: "/analytics", settings: "/settings" };

export default function ScreenPreviews() {
  const q = new URLSearchParams(window.location.search);
  const [screen, setScreen] = useState<Screen>(SCREENS.includes(q.get("screen") as Screen) ? (q.get("screen") as Screen) : "plans");
  const [planId, setPlanId] = useState(q.get("plan") ?? "p1");
  const empty = q.get("state") === "empty";
  const tab = (q.get("tab") as InsightsTab | null) ?? "overview";
  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useT();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const th = p.get("theme");
    const lang = p.get("lang");
    if (th && (THEME_IDS as readonly string[]).includes(th)) setTheme(th as ThemeId);
    if (lang && (LOCALES as readonly string[]).includes(lang)) setLocale(lang as Locale);
  }, [setTheme, setLocale]);

  const catName = (id: string | null) => {
    const c = CATS.find((x) => x.id === id);
    return c ? c[locale] : null;
  };
  const plans: PlanView[] = RAW_PLANS.map((r) => ({
    ...r,
    title: r[locale],
    createdBy: NAMES[r.by] ?? r.by,
    category: catName(r.cat),
    memo: r.memo?.[locale],
  }));

  const insights = useMemo(() => {
    // 今月は今日まで（先の日は0円の平らな線になるだけなので出さない）
    const dates = Array.from({ length: Number(TODAY.slice(8)) }, (_, i) => addDays(`${YM}-01`, i));
    const cats = categoryBreakdown({ yearMonth: YM, expenses, categories: CATS.map((c) => ({ id: c.id, name: c[locale] })) });
    const trend = monthlyTrend({ endYearMonth: YM, months: 6, expenses, budgets: BUDGETS });
    const stats = trendStats(trend, YM);
    const members = memberBreakdown({ yearMonth: YM, memberIds: [ME, HARU], expenses, plans: planLikes });
    return {
      yearMonth: YM,
      actual: summary.actualTotal,
      budget: summary.budget,
      usageRate: summary.usageRate,
      used: summary.actualTotal + summary.plannedTotal,
      momRatio: monthOverMonth({ yearMonth: YM, today: TODAY, expenses }).ratio,
      planVsActual: planVsActual({ yearMonth: YM, plans: planLikes, expenses }),
      daily: dailySpend({ dates, expenses }),
      dailySelected: Number(TODAY.slice(8)) - 1,
      categories: cats.rows.map((r) => ({ key: r.categoryId ?? "none", name: r.categoryId === null ? (locale === "ja" ? "未分類" : "Uncategorized") : r.name, amount: r.amount, ratio: r.ratio })),
      categoryTotal: cats.total,
      trend,
      trendAverage: stats.average,
      trendOverCount: stats.overCount,
      members: members.map((m) => ({ id: m.userId, name: m.userId ? (NAMES[m.userId] ?? "") : "", amount: m.amount, ratio: summary.actualTotal === 0 ? 0 : m.amount / summary.actualTotal, planCount: m.planCount })),
    };
  }, [locale]);

  const plan = plans.find((p) => p.id === planId) ?? plans[0]!;
  const planLike = planLikes.find((p) => p.id === plan.id)!;

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
          <div className="flex flex-wrap gap-x-2">
            <TabChips
              label="Language"
              value={locale}
              onChange={setLocale}
              tone={theme.tone.page}
              options={[
                { value: "en", label: "EN" },
                { value: "ja", label: "日本語" },
              ]}
            />
            <TabChips
              label="Screen"
              value={screen}
              onChange={setScreen}
              tone={theme.tone.page}
              options={SCREENS.map((s) => ({ value: s, label: s }))}
            />
          </div>
        </div>

        {screen === "plans" && (
          <PlansScreen
            plans={empty ? [] : plans}
            today={TODAY}
            onOpen={(id) => {
              setPlanId(id);
              setScreen("plan");
            }}
            onAdd={() => undefined}
          />
        )}
        {screen === "plan" && (
          <PlanDetailScreen
            key={`${plan.id}-${locale}`}
            plan={plan}
            today={TODAY}
            onBack={() => setScreen("plans")}
            previewRemaining={(amount, date) => {
              const s = summarizeMonth({ yearMonth: yearMonthOf(date), budget: budgetOf(yearMonthOf(date)), plans: planLikes, expenses });
              return remainingAfterPlanChange(s, planLike, { amount, yearMonth: yearMonthOf(date) });
            }}
          />
        )}
        {screen === "insights" && <InsightsScreen key={locale} data={insights} initialTab={tab} nextDisabled />}
        {screen === "settings" && (
          <SettingsScreen
            data={{
              me: { name: "Aoi", email: "aoi@example.com" },
              space: {
                name: locale === "ja" ? "ふたりの家" : "Our home",
                members: [
                  { id: ME, name: "Aoi", isMe: true },
                  { id: HARU, name: "Haru" },
                ],
                max: 4,
                invite: { kind: "fresh", url: "https://covow.example/invite/Xk2f…", expiresAt: "2026-10-28T10:00:00.000Z" },
                inviteHours: INVITE_TTL_HOURS,
                onRemoveMember: () => undefined,
              },
              budgets: [0, 1, 2].map((i) => ({ yearMonth: addMonths(YM, i), amount: budgetOf(addMonths(YM, i)) })),
              categories: CATS.map((c) => ({ id: c.id, name: c[locale] })),
            }}
          />
        )}
      </main>
      <FloatingNav currentPath={NAV_PATH[screen]} />
    </>
  );
}
