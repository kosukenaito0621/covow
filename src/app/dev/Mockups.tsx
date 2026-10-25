import "./mockups.css";
import { useState, type ReactNode } from "react";
import { weekDates, weekStartOf, addDays } from "@shared/date/jst";
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
 * デザイン案の比較（開発環境だけ）。?v=a | b | c で切り替え。数字はすべてサンプル。
 *  案A 霧のオーロラ：明るい霧＋パステルのオーロラ。ヒーローはスモークガラス。ピルは2列
 *  案B 夜のオーロラ：深い紺＋鮮やかなオーロラ。すべて暗いガラス。ピルは横長を縦に並べる
 *  案C 水面のひかり：澄んだ水色。ヒーローも明るい水のガラス。実支出を大きく、残り2つを2列
 */

type Variant = "a" | "b" | "c";

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
  const initial = (new URLSearchParams(window.location.search).get("v") as Variant) ?? "a";
  const [v, setV] = useState<Variant>(["a", "b", "c"].includes(initial) ? initial : "a");
  return (
    <div className={`theme-${v} min-h-dvh ${v === "b" ? "text-white" : "text-ink"}`}>
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
          tone={v === "b" ? "dark" : "light"}
          options={[
            { value: "a", label: "A 霧のオーロラ" },
            { value: "b", label: "B 夜のオーロラ" },
            { value: "c", label: "C 水面のひかり" },
          ]}
        />
        <Header dark={v === "b"} />
        <Hero variant={v} />
        {v === "a" && <PillsGrid />}
        {v === "b" && <PillsStacked />}
        {v === "c" && <PillsWide />}
        <Upcoming card={v === "b" ? "lg-dark" : v === "c" ? "lg-water" : "lg-light"} muted={v === "b" ? "text-white/90" : "text-ink-muted"} />
      </main>
      {/* 追加ボタンはほかの丸いボタンと同じ 44px。親指の届く右下（ナビの上）に置く */}
      <div data-fixed-overlay className="fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px)] z-30">
        <AddPill onClick={() => undefined} />
      </div>
      <FloatingNav currentPath="/" />
    </div>
  );
}

function Header({ dark }: { dark: boolean }) {
  const tone = dark ? "dark" : "light";
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
      <div className="flex -space-x-2" aria-label="メンバー：あおい、はる">
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">あ</span>
        <span className="add-orb inline-flex size-10 items-center justify-center rounded-full text-[14px] font-semibold">は</span>
      </div>
    </header>
  );
}

function Hero({ variant }: { variant: Variant }) {
  const thisWeek = weekStartOf(TODAY);
  const [start, setStart] = useState(thisWeek);
  const [sel, setSel] = useState(6);
  const dates = weekDates(start);
  const amounts = start === thisWeek ? WEEK : WEEK.map((a) => Math.round(a * 0.7));
  const light = variant === "c";
  const tone = light ? "light" : "dark";
  const peak = amounts.indexOf(Math.max(...amounts));
  return (
    <section aria-labelledby="hero-label" className={`lg ${light ? "lg-water" : "lg-dark"} rounded-[32px] p-5`}>
      <div className="flex items-center justify-between gap-3">
        <p id="hero-label" className={`text-[15px] font-medium ${light ? "text-ink" : "text-white"}`}>
          今月、あといくら使える？
        </p>
        <CircleIconButton tone={tone} icon="arrowUpRight" label="分析を見る" />
      </div>
      <HeroAmount value={remaining} />
      <p className={`num mt-1 flex flex-wrap gap-x-3 text-[13px] ${light ? "text-ink-muted" : "text-white/90"}`}>
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

function Pill({
  className,
  label,
  children,
  aria,
  foot,
}: {
  className: string;
  label: string;
  children: ReactNode;
  aria: string;
  foot?: ReactNode;
}) {
  return (
    <div role="group" aria-label={aria} className={`lg rounded-full ${className}`}>
      <span className="block text-[13px] leading-none font-semibold">{label}</span>
      <span aria-hidden="true">{children}</span>
      {foot && <span className="flex items-center gap-1.5 text-[12px] leading-none font-medium">{foot}</span>}
    </div>
  );
}

const ariaActual = `今月の実支出 ${formatYen(DATA.actual)}、先月の同じ日までより12%多い`;
const ariaPlanned = `未購入の予定 ${formatYen(DATA.planned)}、${DATA.plannedCount}件`;
const ariaUsage = `予算使用率 ${Math.round(usage * 100)}%`;
// 2列のピルの中で数字に使える幅
const HALF = "((min(100vw, 480px) - 44px) / 2 - 52px)";

/** 案A：実支出と未購入の予定を2列、使用率を横長に */
function PillsGrid() {
  const cls = "flex h-[112px] flex-col justify-between px-[26px] py-[16px]";
  const wide = "col-span-2 flex h-[84px] items-center justify-between gap-3 px-8";
  return (
    <div className="grid grid-cols-2 gap-3">
      <Pill className={`lg-ember ${cls}`} label="今月の実支出" aria={ariaActual} foot={<DeltaBadge ratio={0.12} />}>
        <DotAmount value={DATA.actual} max={24} room={HALF} />
      </Pill>
      <Pill className={`lg-indigo ${cls}`} label="未購入の予定" aria={ariaPlanned} foot={`${DATA.plannedCount}件`}>
        <DotAmount value={DATA.planned} max={24} room={HALF} />
      </Pill>
      <div role="group" aria-label={ariaUsage} className={`lg lg-aurora rounded-full ${wide}`}>
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

/** 案B：横長のカプセルを縦に3本。ラベルは左、金額は右に大きく */
function PillsStacked() {
  const cls = "flex h-[84px] items-center justify-between gap-3 px-7";
  const ROOM = "(min(100vw, 480px) - 32px - 56px - 120px)";
  return (
    <div className="flex flex-col gap-3">
      {[
        { c: "lg-ember", l: "今月の実支出", a: ariaActual, v: <DotAmount value={DATA.actual} max={30} room={ROOM} />, f: <DeltaBadge ratio={0.12} /> },
        { c: "lg-indigo", l: "未購入の予定", a: ariaPlanned, v: <DotAmount value={DATA.planned} max={30} room={ROOM} />, f: `${DATA.plannedCount}件` },
        {
          c: "lg-aurora",
          l: "予算使用率",
          a: ariaUsage,
          v: (
            <span className="dot-number text-[30px]">
              {Math.round(usage * 100)}
              <span className="font-ui text-[16px] font-bold">%</span>
            </span>
          ),
          f: <UsageArc rate={usage} />,
        },
      ].map((p) => (
        <div key={p.l} role="group" aria-label={p.a} className={`lg rounded-full ${p.c} ${cls}`}>
          <span className="flex flex-col gap-2">
            <span className="text-[13px] leading-none font-semibold">{p.l}</span>
            <span className="flex items-center gap-1.5 text-[12px] leading-none font-medium">{p.f}</span>
          </span>
          <span aria-hidden="true">{p.v}</span>
        </div>
      ))}
    </div>
  );
}

/** 案C：実支出を横いっぱいに大きく、未購入の予定と使用率を2列 */
function PillsWide() {
  return (
    <div className="flex flex-col gap-3">
      <Pill
        className="lg-ember flex h-[96px] flex-col justify-between px-8 py-[16px]"
        label="今月の実支出"
        aria={ariaActual}
        foot={<DeltaBadge ratio={0.12} />}
      >
        <DotAmount value={DATA.actual} max={32} room="(min(100vw, 480px) - 96px)" />
      </Pill>
      <div className="grid grid-cols-2 gap-3">
        <Pill className="lg-indigo flex h-[104px] flex-col justify-between px-[26px] py-[16px]" label="未購入の予定" aria={ariaPlanned} foot={`${DATA.plannedCount}件`}>
          <DotAmount value={DATA.planned} max={24} room={HALF} />
        </Pill>
        <Pill className="lg-aurora flex h-[104px] flex-col justify-between px-[26px] py-[16px]" label="予算使用率" aria={ariaUsage} foot={<UsageArc rate={usage} />}>
          <span className="dot-number text-[26px]">
            {Math.round(usage * 100)}
            <span className="font-ui text-[15px] font-bold">%</span>
          </span>
        </Pill>
      </div>
    </div>
  );
}

function Upcoming({ card, muted }: { card: string; muted: string }) {
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
        <article key={p.t} className={`lg ${card} flex items-center justify-between gap-3 rounded-[24px] px-4 py-3`}>
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
