import "./mockups.css";
import { useState } from "react";
import { addDays, weekDates, weekStartOf } from "@shared/date/jst";
import { formatNumber, formatYen } from "@shared/money/amount";
import { DayChips } from "../components/charts/DayChips";
import { SpendCurve } from "../components/charts/SpendCurve";
import { WeekNavigator } from "../components/charts/WeekNavigator";
import { AddPill } from "../components/glass/AddPill";
import { DeltaBadge } from "../components/glass/DeltaBadge";
import { FloatingNav } from "../components/glass/FloatingNav";
import { TabChips } from "../components/glass/TabChips";
import { UsageArc } from "../components/glass/UsageArc";
import { DemoDataBanner } from "../components/ui/Badges";
import { CircleIconButton } from "../components/ui/Buttons";
import { HeroAmount } from "../components/ui/HeroAmount";
import { Icon } from "../components/ui/Icon";

/*
 * デザイン案の比較（開発環境だけ）。?v=aurora | earthy | tropical で切り替え。数字はすべてサンプル。
 * 質感（透けるガラス・オーロラの背景）は共通で、色だけを変える。配置も共通にして色を比べやすくする。
 *  Aurora   #0A1422 #1A3553 #2AA3B8 #74F9D9 #FFFFFF（夜の紺。すべて暗いガラス）
 *  Earthy   #6C4A3A #9A6A4F #C6925A #DDC38A #7B8A6A（砂の明るさ。ヒーローは土色のガラス）
 *  Tropical #A6C4B0 #A3D1BF #B2E0C9 #F8DAB9 #F59C8E（明るい砂浜。ヒーローも明るいガラス）
 */

type Variant = "aurora" | "earthy" | "tropical";

const THEMES: Record<Variant, { label: string; page: "light" | "dark"; hero: "light" | "dark"; card: "light" | "dark" }> = {
  aurora: { label: "Aurora", page: "dark", hero: "dark", card: "dark" },
  earthy: { label: "Earthy", page: "light", hero: "dark", card: "light" },
  tropical: { label: "Tropical", page: "light", hero: "light", card: "light" },
};

const TODAY = "2026-10-25";
const WEEK = [3_200, 8_200, 0, 1_480, 5_600, 12_900, 2_300];
const DATA = { budget: 180_000, actual: 63_480, planned: 41_200, plannedCount: 3 };
const remaining = DATA.budget - DATA.actual - DATA.planned;
const usage = (DATA.actual + DATA.planned) / DATA.budget;
const UPCOMING = [
  { t: "ダイニングチェア（2脚）", a: 28_000, who: "あおい", d: "10/27" },
  { t: "加湿器", a: 9_800, who: "はる", d: "10/29" },
  { t: "冬用のラグ", a: 3_400, who: "あおい", d: "11/2" },
];

/** 金額をすべての桁で表示する（¥ は通常の書体、数字はドット文字）。桁が増えたら文字を小さくする */
function DotAmount({ value, max = 28, room }: { value: number; max?: number; room: string }) {
  const digits = formatNumber(value);
  const size = `min(${max}px, calc(${room} / ${(digits.length * 0.66 + 0.7).toFixed(2)}))`;
  return (
    <span className="flex items-baseline gap-0.5 whitespace-nowrap" style={{ fontSize: size }}>
      <span className="text-[0.62em] font-bold">¥</span>
      <span className="dot-number">{digits}</span>
    </span>
  );
}

export default function Mockups() {
  const q = new URLSearchParams(window.location.search).get("v") as Variant | null;
  const [v, setV] = useState<Variant>(q && q in THEMES ? q : "aurora");
  const t = THEMES[v];
  return (
    <div className={`mock theme-${v} min-h-dvh text-[color:var(--page-text)]`}>
      <div className="aurora" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <span className="b4" />
        <span className="ribbon" />
      </div>
      <DemoDataBanner />
      <main className="app-shell flex flex-col gap-5">
        <TabChips
          label="デザイン案"
          value={v}
          onChange={setV}
          tone={t.page}
          options={(Object.keys(THEMES) as Variant[]).map((k) => ({ value: k, label: THEMES[k].label }))}
        />
        <Header tone={t.page} />
        <Hero tone={t.hero} />
        <Pills />
        <Upcoming tone={t.card} />
      </main>
      {/* 追加ボタンはほかの丸いボタンと同じ 44px。親指の届く右下（ナビの上）に置く */}
      <div
        data-fixed-overlay
        className="fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px)] z-30"
      >
        <AddPill onClick={() => undefined} />
      </div>
      <FloatingNav currentPath="/" />
    </div>
  );
}

function Header({ tone }: { tone: "light" | "dark" }) {
  return (
    <header className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[20px] font-bold tracking-tight">COVOW</p>
        <div className="mt-0.5 flex items-center gap-1">
          <CircleIconButton tone={tone} icon="chevronLeft" label="前の月" />
          <h1 className="num text-[15px] font-semibold">2026年10月</h1>
          <CircleIconButton tone={tone} icon="chevronRight" label="次の月" />
        </div>
      </div>
      <div className="flex -space-x-2 text-[#1f2937]" aria-label="メンバー：あおい、はる">
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">あ</span>
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">は</span>
      </div>
    </header>
  );
}

function Hero({ tone }: { tone: "light" | "dark" }) {
  const thisWeek = weekStartOf(TODAY);
  const [start, setStart] = useState(thisWeek);
  const [sel, setSel] = useState(6);
  const dates = weekDates(start);
  const amounts = start === thisWeek ? WEEK : WEEK.map((a) => Math.round(a * 0.7));
  const muted = tone === "light" ? "text-ink-muted" : "text-white/90";
  const peak = amounts.indexOf(Math.max(...amounts));
  return (
    <section aria-labelledby="hero-label" className="lg lg-hero rounded-[32px] p-5">
      <div className="flex items-center justify-between gap-3">
        <p id="hero-label" className="text-[15px] font-medium">
          今月、あといくら使える？
        </p>
        <CircleIconButton tone={tone} icon="arrowUpRight" label="分析を見る" />
      </div>
      <HeroAmount value={remaining} />
      <p className={`num mt-1 flex flex-wrap gap-x-3 text-[13px] ${muted}`}>
        <span className="whitespace-nowrap">予算 {formatYen(DATA.budget)}</span>
        <span className="whitespace-nowrap">実支出 {formatYen(DATA.actual)}</span>
        <span className="whitespace-nowrap">予定 {formatYen(DATA.planned)}</span>
      </p>
      <div className="mt-4">
        <SpendCurve
          points={dates.map((d, i) => ({ key: d, amount: amounts[i] ?? 0 }))}
          selectedIndex={sel}
          baseline={{ value: Math.round(amounts.reduce((a, b) => a + b, 0) / 7), label: "1日の平均" }}
          summary={`今週の支出は${["月", "火", "水", "木", "金", "土", "日"][peak]}曜が最も多く ${formatYen(amounts[peak] ?? 0)}`}
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
    </section>
  );
}

const ariaActual = `今月の実支出 ${formatYen(DATA.actual)}、先月の同じ日までより12%多い`;
const ariaPlanned = `未購入の予定 ${formatYen(DATA.planned)}、${DATA.plannedCount}件`;
const ariaUsage = `予算使用率 ${Math.round(usage * 100)}%`;
// 2列のピルの中で数字に使える幅
const HALF = "((min(100vw, 480px) - 44px) / 2 - 52px)";

/** 実支出と未購入の予定を2列、使用率を横長に */
function Pills() {
  const half = "lg rounded-full flex h-[112px] flex-col justify-between px-[26px] py-[16px]";
  return (
    <div className="grid grid-cols-2 gap-3">
      <div role="group" aria-label={ariaActual} className={`${half} lg-p1`}>
        <span className="text-[13px] leading-none font-semibold">今月の実支出</span>
        <span aria-hidden="true">
          <DotAmount value={DATA.actual} max={24} room={HALF} />
        </span>
        <span className="flex items-center text-[12px] leading-none font-medium">
          <DeltaBadge ratio={0.12} />
        </span>
      </div>
      <div role="group" aria-label={ariaPlanned} className={`${half} lg-p2`}>
        <span className="text-[13px] leading-none font-semibold">未購入の予定</span>
        <span aria-hidden="true">
          <DotAmount value={DATA.planned} max={24} room={HALF} />
        </span>
        <span className="text-[12px] leading-none font-medium">{DATA.plannedCount}件</span>
      </div>
      <div
        role="group"
        aria-label={ariaUsage}
        className="lg lg-p3 col-span-2 flex h-[84px] items-center justify-between gap-3 rounded-full px-8"
      >
        <span className="flex flex-col gap-2">
          <span className="text-[13px] leading-none font-semibold">予算使用率</span>
          <UsageArc rate={usage} />
        </span>
        <span aria-hidden="true" className="dot-number text-[30px]">
          {Math.round(usage * 100)}
          <span className="font-ui text-[16px] font-bold">%</span>
        </span>
      </div>
    </div>
  );
}

function Upcoming({ tone }: { tone: "light" | "dark" }) {
  const muted = tone === "light" ? "text-ink-muted" : "text-white/90";
  return (
    <section aria-labelledby="upcoming" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 id="upcoming" className="text-[17px] font-semibold">
          直近の購入予定
        </h2>
        <a href="#" className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold">
          すべて
          <Icon name="chevronRight" size={16} />
        </a>
      </div>
      {UPCOMING.map((p) => (
        <article key={p.t} className="lg lg-card flex items-center justify-between gap-3 rounded-[24px] px-4 py-3">
          <div className="min-w-0">
            <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.t}</p>
            <p className={`num text-[12px] ${muted}`}>
              {p.who} ・ {p.d}
            </p>
          </div>
          <span className="num shrink-0 text-[15px] font-semibold">{formatYen(p.a)}</span>
        </article>
      ))}
    </section>
  );
}
