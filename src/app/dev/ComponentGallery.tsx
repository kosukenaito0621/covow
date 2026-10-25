import { useState } from "react";
import { addDays, weekDates, weekStartOf } from "@shared/date/jst";
import { formatYen, formatYenShort } from "@shared/money/amount";
import { CategoryBars } from "../components/charts/CategoryBars";
import { DayChips } from "../components/charts/DayChips";
import { SpendCurve } from "../components/charts/SpendCurve";
import { WeekNavigator } from "../components/charts/WeekNavigator";
import { AddPill } from "../components/glass/AddPill";
import { ConfirmDialog } from "../components/glass/ConfirmDialog";
import { DeltaBadge } from "../components/glass/DeltaBadge";
import { FloatingNav } from "../components/glass/FloatingNav";
import { GlassSheet } from "../components/glass/GlassSheet";
import { HeroGlassCard } from "../components/glass/HeroGlassCard";
import { MetricPill } from "../components/glass/MetricPill";
import { TabChips } from "../components/glass/TabChips";
import { UsageArc } from "../components/glass/UsageArc";
import { HeroAmount } from "../components/ui/HeroAmount";
import { CategoryBadge, DemoDataBanner, FromPlanBadge, StatusBadge } from "../components/ui/Badges";
import { CircleIconButton, PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../components/ui/FormField";
import { AttentionNote, EmptyState, ErrorMessage, LoadingSkeleton, Skeleton } from "../components/ui/States";

/*
 * 部品の確認用ページ（開発環境だけ）。数字はすべてサンプル。
 * ?state=empty / loading / error / long で状態を切り替えられる。
 */

const TODAY = "2026-10-25";
const SAMPLE_WEEK = [3_200, 8_200, 0, 1_480, 5_600, 12_900, 2_300];

type View = "home" | "parts";

export default function ComponentGallery() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state") ?? "data";
  const [view, setView] = useState<View>((params.get("view") as View) ?? "home");

  return (
    <>
      <div className="frost-backdrop" aria-hidden="true" />
      <DemoDataBanner />
      <main className="app-shell flex flex-col gap-5">
        <TabChips
          label="確認する内容"
          value={view}
          onChange={setView}
          options={[
            { value: "home", label: "ホームの組み合わせ" },
            { value: "parts", label: "部品の一覧" },
          ]}
        />
        {view === "home" ? <HomePreview state={state} /> : <PartsPreview />}
      </main>
      <FloatingNav currentPath="/" />
    </>
  );
}

function HomeHeader() {
  return (
    <header className="flex items-center justify-between gap-2">
      <div>
        <p className="text-[20px] font-bold tracking-tight">COVOW</p>
        <div className="mt-0.5 flex items-center gap-1">
          <CircleIconButton tone="light" icon="chevronLeft" label="前の月" className="size-11" />
          <h1 className="num text-[15px] font-semibold">2026年10月</h1>
          <CircleIconButton tone="light" icon="chevronRight" label="次の月" className="size-11" />
        </div>
      </div>
      <div className="flex -space-x-2" aria-label="メンバー：あおい、はる">
        <span className="inline-flex size-10 items-center justify-center rounded-full border-2 border-frost bg-lavender text-[14px] font-semibold text-ink">
          あ
        </span>
        <span className="inline-flex size-10 items-center justify-center rounded-full border-2 border-frost bg-ice text-[14px] font-semibold text-ink">
          は
        </span>
      </div>
    </header>
  );
}

function HomePreview({ state }: { state: string }) {
  const weekStart = weekStartOf(TODAY);
  const [start, setStart] = useState(weekStart);
  const dates = weekDates(start);
  const amounts = start === weekStart ? SAMPLE_WEEK : SAMPLE_WEEK.map((a) => Math.round(a * 0.7));
  const [sel, setSel] = useState(6);
  const long = state === "long";
  const budget = long ? 99_999_999 : 180_000;
  const actual = long ? 12_345_678 : 63_480;
  const planned = long ? 9_876_543 : 41_200;
  const remaining = budget - actual - planned;
  const peak = amounts.indexOf(Math.max(...amounts));
  const weekdays = ["月", "火", "水", "木", "金", "土", "日"];
  const [sheet, setSheet] = useState(false);

  if (state === "loading") {
    return (
      <>
        <HomeHeader />
        <LoadingSkeleton label="ホームを読み込み中">
          <div className="hero-glass has-grain flex flex-col gap-3 p-5">
            <Skeleton tone="dark" className="h-4 w-40" />
            <Skeleton tone="dark" className="h-12 w-56" />
            <Skeleton tone="dark" className="h-3 w-64" />
            <Skeleton tone="dark" className="mt-4 h-28 w-full" />
            <Skeleton tone="dark" className="h-11 w-full" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[112px] rounded-full" />
            ))}
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
          <p id="hero-label" className="text-[15px] text-white/78">
            今月、あといくら使える？
          </p>
          <p className="mt-1 text-[15px]">今月の予算を決めよう</p>
          <PrimaryButton tone="dark" className="mt-3">
            予算を決める
          </PrimaryButton>
          <div className="mt-6 rounded-[24px] border border-white/15">
            <EmptyState
              tone="dark"
              icon="chart"
              title="まだ記録がありません"
              body="買いたいものを登録すると、ここにふたりの支出が表示されます"
            />
          </div>
        </HeroGlassCard>
        <div className="grid grid-cols-2 gap-3">
          <MetricPill theme="ember" label="今月の実支出" value="0" ariaLabel="今月の実支出 0円" sub="先月の記録なし" />
          <MetricPill theme="indigo" label="未購入の予定" value="0" ariaLabel="未購入の予定 0円、0件" sub="0件" />
          <MetricPill theme="aurora" label="予算使用率" value="—" ariaLabel="予算使用率 予算が未設定です" sub="予算が未設定" />
          <div className="flex items-center justify-center"><AddPill label="最初の購入予定を追加" onClick={() => undefined} /></div>
        </div>
      </>
    );
  }

  return (
    <>
      <HomeHeader />
      <HeroGlassCard labelledBy="hero-label">
        <div className="flex items-center justify-between gap-3">
          <p id="hero-label" className="text-[15px] text-white/78">
            今月、あといくら使える？
          </p>
          <CircleIconButton icon="arrowUpRight" label="分析を見る" />
        </div>
        <HeroAmount value={remaining} />
        <p className="num mt-1 flex flex-wrap gap-x-1.5 text-[13px] text-white/78">
          <span className="whitespace-nowrap">予算 {formatYen(budget)}</span>
          <span aria-hidden="true">・</span>
          <span className="whitespace-nowrap">実支出 {formatYen(actual)}</span>
          <span aria-hidden="true">・</span>
          <span className="whitespace-nowrap">予定 {formatYen(planned)}</span>
        </p>
        <div className="mt-5">
          <SpendCurve
            points={dates.map((d, i) => ({ key: d, amount: amounts[i] ?? 0 }))}
            selectedIndex={sel}
            baseline={{ value: Math.round(amounts.reduce((a, b) => a + b, 0) / 7), label: "1日の平均" }}
            summary={`今週の支出は${weekdays[peak]}曜が最も多く ${formatYen(amounts[peak] ?? 0)}`}
          />
        </div>
        <div className="mt-3">
          <DayChips dates={dates} amounts={amounts} selectedIndex={sel} onSelect={setSel} today={TODAY} />
        </div>
        <div className="mt-3">
          <WeekNavigator
            start={dates[0]!}
            end={dates[6]!}
            onPrev={() => setStart(addDays(start, -7))}
            onNext={() => setStart(addDays(start, 7))}
            nextDisabled={start >= weekStart}
          />
        </div>
      </HeroGlassCard>

      <div className="grid grid-cols-2 gap-3">
        <MetricPill
          theme="ember"
          label="今月の実支出"
          value={formatYenShort(actual)}
          ariaLabel={`今月の実支出 ${formatYen(actual)}、先月の同じ日までより12%多い`}
          aside={<DeltaBadge ratio={0.12} />}
          onClick={() => undefined}
        />
        <MetricPill
          theme="indigo"
          label="未購入の予定"
          value={formatYenShort(planned)}
          ariaLabel={`未購入の予定 ${formatYen(planned)}、3件`}
          sub="3件"
          onClick={() => undefined}
        />
        <MetricPill
          theme="aurora"
          label="予算使用率"
          value={`${Math.round(((actual + planned) / budget) * 100)}%`}
          ariaLabel={`予算使用率 ${Math.round(((actual + planned) / budget) * 100)}%`}
          aside={<UsageArc rate={(actual + planned) / budget} />}
        />
        <div className="flex items-center justify-center"><AddPill onClick={() => setSheet(true)} /></div>
      </div>

      <section aria-labelledby="upcoming" className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 id="upcoming" className="text-[17px] font-semibold">
            直近の購入予定
          </h2>
          <a href="#" className="inline-flex min-h-11 items-center text-[14px] font-semibold underline-offset-4 hover:underline">
            すべて見る
          </a>
        </div>
        {[
          { t: "ダイニングチェア（2脚）", a: 28_000, who: "あおい", d: "10/27", s: "planned" as const },
          { t: "加湿器", a: 9_800, who: "はる", d: "10/29", s: "planned" as const },
          { t: "冬用のラグ", a: 3_400, who: "あおい", d: "11/2", s: "planned" as const },
        ].map((p) => (
          <article key={p.t} className="flex items-center justify-between gap-3 rounded-[24px] bg-white/72 px-4 py-3 shadow-[inset_0_0_0_1px_rgb(17_24_39/0.06)]">
            <div className="min-w-0">
              <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{p.t}</p>
              <p className="text-[12px] text-ink-muted">
                {p.who} ・ {p.d}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="num text-[15px] font-semibold">{formatYen(p.a)}</span>
              <StatusBadge status={p.s} />
            </div>
          </article>
        ))}
      </section>

      <button
        type="button"
        className="flex min-h-11 items-center gap-2 rounded-2xl bg-white/60 px-4 py-2 text-left text-[14px] font-medium"
      >
        先月以前の未購入の予定が2件あります
      </button>

      <GlassSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title="購入予定を追加"
        footer={
          <div className="flex flex-col gap-3">
            <p className="num flex items-center justify-between text-[14px]">
              <span className="text-white/78">いまの残額 {formatYen(remaining)}</span>
              <span className="font-semibold">→ 登録後 {formatYen(remaining - 128_400)}</span>
            </p>
            <PrimaryButton tone="dark" fullWidth>
              登録する
            </PrimaryButton>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label="商品名" required>
            {(p) => <TextInput {...p} defaultValue="ソファ" />}
          </FormField>
          <FormField label="予定金額" required error="99,999,999円以下で入力してください">
            {(p) => <AmountInput {...p} defaultValue="128,400" />}
          </FormField>
          <AttentionNote tone="dark">予算を超えそうです。内容を確認しますか？</AttentionNote>
        </div>
      </GlassSheet>
    </>
  );
}

function PartsPreview() {
  const [tab, setTab] = useState<"all" | "planned" | "purchased" | "canceled">("all");
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <Section title="TabChips">
        <TabChips
          label="予定の絞り込み"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "すべて" },
            { value: "planned", label: "未購入" },
            { value: "purchased", label: "購入済み" },
            { value: "canceled", label: "キャンセル" },
          ]}
        />
      </Section>

      <Section title="MetricPill（8桁・短縮表示）">
        <div className="grid grid-cols-2 gap-3">
          {[9_800, 128_400, 1_234_567, 99_999_999].map((v) => (
            <MetricPill
              key={v}
              theme="ember"
              label="今月の実支出"
              value={formatYenShort(v)}
              ariaLabel={`今月の実支出 ${formatYen(v)}`}
              aside={<DeltaBadge ratio={-0.03} />}
              sub={formatYen(v)}
            />
          ))}
          <MetricPill theme="indigo" label="未購入の予定" value="9999万" ariaLabel="未購入の予定" sub="12件" />
          <MetricPill
            theme="aurora"
            label="予算使用率"
            value="115%"
            ariaLabel="予算使用率 115%、予算を超えそうです"
            aside={<UsageArc rate={1.15} />}
            sub="超えそう"
          />
        </div>
      </Section>

      <Section title="AmountDisplay（1億円未満の全桁）">
        <div className="hero-glass has-grain flex flex-col gap-1 p-5">
          {[1, 12, 123, 1_234, 12_345, 123_456, 1_234_567, 12_345_678, 99_999_999, -15_000].map((v) => (
            <HeroAmount key={v} value={v} />
          ))}
        </div>
      </Section>

      <Section title="バッジ">
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
          <DeltaBadge ratio={null} />
        </div>
      </Section>

      <Section title="ボタン">
        <div className="flex flex-wrap items-center gap-2">
          <PrimaryButton icon="check">購入済みにする</PrimaryButton>
          <SecondaryButton icon="edit">編集</SecondaryButton>
          <PrimaryButton loading>保存しています</PrimaryButton>
          <PrimaryButton disabled>無効</PrimaryButton>
          <CircleIconButton tone="light" icon="info" label="ヘルプ" />
          <AddPill onClick={() => setConfirm(true)} />
        </div>
      </Section>

      <Section title="カテゴリ別（横棒）">
        <div className="hero-glass has-grain p-5">
          <CategoryBars
            rows={[
              { key: "food", name: "食費", amount: 32_400, ratio: 0.51 },
              { key: "home", name: "家具・家電", amount: 18_000, ratio: 0.28 },
              { key: "daily", name: "日用品", amount: 8_480, ratio: 0.13 },
              { key: "none", name: "未分類", amount: 4_600, ratio: 0.08 },
            ]}
          />
        </div>
      </Section>

      <Section title="空・エラー・注意">
        <div className="flex flex-col gap-3 rounded-[24px] bg-white/60">
          <EmptyState title="購入予定はまだありません" body="ふたりの予定を共有しよう" action={{ label: "購入予定を追加", onClick: () => undefined }} />
        </div>
        <ErrorMessage message="保存できませんでした。通信状況を確認して、もう一度お試しください" onRetry={() => undefined} />
        <AttentionNote>予算を ¥15,000 超えそうです</AttentionNote>
      </Section>

      <ConfirmDialog
        open={confirm}
        title="この予定を削除しますか？"
        body="支出の記録は残ります（予定とのひも付けだけ外れます）"
        confirmLabel="削除する"
        onConfirm={() => setConfirm(false)}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[15px] font-semibold text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}
