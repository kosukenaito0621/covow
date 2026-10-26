import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useTheme } from "../../theme/ThemeProvider";
import { LoadingSkeleton, Skeleton } from "../ui/States";

/*
 * 読み込み中の仮の画面。本物と同じガラスの面・同じ高さにして、中身が届いたときに位置がずれないようにする
 * （高さは 375px 幅で本物を測った値。2026-10-26）。
 */

/** ガラスのカード（本物と同じ面）の中に、灰色の棒を並べる */
function CardShell({ className, children }: { className: string; children?: ReactNode }) {
  return <div className={`lg lg-card ${className}`}>{children}</div>;
}

/** 画面の見出し（予定・分析・支出の大きなタイトル） */
function TitleBar() {
  const { theme } = useTheme();
  return <Skeleton tone={theme.tone.page} className="h-7 w-36" />;
}

/** 月の切り替え（‹ 2026年10月 ›）の行 */
function MonthRow() {
  const { theme } = useTheme();
  return (
    <div className="flex h-11 items-center gap-2">
      <Skeleton tone={theme.tone.page} className="size-11 rounded-full" />
      <Skeleton tone={theme.tone.page} className="h-5 w-28" />
      <Skeleton tone={theme.tone.page} className="size-11 rounded-full" />
    </div>
  );
}

/** 絞り込み・タブの丸いボタンの行 */
function ChipRow({ count }: { count: number }) {
  const { theme } = useTheme();
  return (
    <div className="flex h-[52px] items-center gap-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} tone={theme.tone.page} className="h-11 w-20 rounded-full" />
      ))}
    </div>
  );
}

/** 一覧の1行（予定・支出）。高さ 70px */
function RowCard() {
  const { theme } = useTheme();
  return (
    <CardShell className="flex h-[70px] items-center justify-between gap-3 rounded-[24px] px-4">
      <div className="flex flex-col gap-2">
        <Skeleton tone={theme.tone.card} className="h-4 w-40" />
        <Skeleton tone={theme.tone.card} className="h-3 w-24" />
      </div>
      <Skeleton tone={theme.tone.card} className="h-4 w-16" />
    </CardShell>
  );
}

/** ホームの見出し（COVOW と月の切り替え・メンバー）。高さ 78px */
export function HomeHeaderSkeleton() {
  const { theme } = useTheme();
  return (
    <div className="flex h-[78px] items-start justify-between">
      <div className="flex flex-col gap-1.5">
        <Skeleton tone={theme.tone.page} className="h-6 w-24" />
        <MonthRow />
      </div>
      <Skeleton tone={theme.tone.page} className="size-11 rounded-full" />
    </div>
  );
}

/** ホームの本文（あと使える金額のカード・支出と予定・使用率・直近の予定） */
export function HomeBodySkeleton() {
  const { theme } = useTheme();
  const hero = theme.tone.hero;
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <div className="lg lg-hero flex h-[436px] flex-col rounded-[32px] p-5">
          <Skeleton tone={hero} className="h-3.5 w-32" />
          <Skeleton tone={hero} className="mt-3 h-14 w-56" />
          <Skeleton tone={hero} className="mt-2 h-4 w-64" />
          <Skeleton tone={hero} className="mt-auto h-24 w-full" />
          <div className="mt-4 flex justify-between gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} tone={hero} className="size-10 rounded-full" />
            ))}
          </div>
          <Skeleton tone={hero} className="mt-3 h-12 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CardShell className="h-[112px] rounded-full" />
          <CardShell className="h-[112px] rounded-full" />
          <CardShell className="col-span-2 h-[84px] rounded-full" />
        </div>
        <div className="flex flex-col gap-2.5">
          <Skeleton tone={theme.tone.page} className="h-4 w-28" />
          <RowCard />
          <RowCard />
        </div>
      </div>
    </LoadingSkeleton>
  );
}

/** 予定の一覧（見出し・検索・絞り込み・予定の行） */
export function PlansSkeleton() {
  const { theme } = useTheme();
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <TitleBar />
        <Skeleton tone={theme.tone.page} className="h-12 w-full rounded-full" />
        <ChipRow count={4} />
        <div className="flex flex-col gap-2.5">
          <Skeleton tone={theme.tone.page} className="h-4 w-24" />
          <RowCard />
          <RowCard />
          <RowCard />
        </div>
      </div>
    </LoadingSkeleton>
  );
}

/** 分析（見出しと月・タブ・概要のカード・使用率・予定との比較） */
export function InsightsSkeleton() {
  const { theme } = useTheme();
  const hero = theme.tone.hero;
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <TitleBar />
          <MonthRow />
        </div>
        <ChipRow count={4} />
        <div className="flex flex-col gap-4">
          <div className="lg lg-hero flex h-[362px] flex-col rounded-[32px] p-5">
            <Skeleton tone={hero} className="h-4 w-20" />
            <Skeleton tone={hero} className="mt-3 h-12 w-48" />
            <Skeleton tone={hero} className="mt-2 h-4 w-40" />
            <Skeleton tone={hero} className="mt-auto h-40 w-full" />
          </div>
          <CardShell className="h-[84px] rounded-full" />
          <CardShell className="h-[149px] rounded-[24px]" />
        </div>
      </div>
    </LoadingSkeleton>
  );
}

/** 支出の一覧（戻る・見出し・月・支出の行） */
export function ExpensesSkeleton() {
  const { theme } = useTheme();
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex h-11 items-center gap-2">
            <Skeleton tone={theme.tone.page} className="size-11 rounded-full" />
            <TitleBar />
          </div>
          <MonthRow />
        </div>
        <ExpensesListSkeleton />
      </div>
    </LoadingSkeleton>
  );
}

/** 支出の行だけ（見出しは本物を出しているとき） */
export function ExpensesListSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 5 }, (_, i) => (
        <RowCard key={i} />
      ))}
    </div>
  );
}

/** 予定の詳細（戻る・予定のカード・操作） */
export function PlanDetailSkeleton() {
  const { theme } = useTheme();
  const hero = theme.tone.hero;
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <Skeleton tone={theme.tone.page} className="size-11 rounded-full" />
        <div className="lg lg-hero flex h-48 flex-col gap-3 rounded-[32px] p-5">
          <Skeleton tone={hero} className="h-4 w-24" />
          <Skeleton tone={hero} className="h-7 w-56" />
          <Skeleton tone={hero} className="mt-auto h-10 w-40" />
        </div>
        <CardShell className="h-40 rounded-[24px]" />
      </div>
    </LoadingSkeleton>
  );
}

/** 設定（見出し・プロフィール・テーマ） */
export function SettingsSkeleton() {
  const { theme } = useTheme();
  return (
    <LoadingSkeleton>
      <div className="flex flex-col gap-5">
        <TitleBar />
        <CardShell className="flex h-[98px] items-center gap-3 rounded-[24px] px-4">
          <Skeleton tone={theme.tone.card} className="size-14 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton tone={theme.tone.card} className="h-4 w-28" />
            <Skeleton tone={theme.tone.card} className="h-3 w-40" />
          </div>
        </CardShell>
        <Skeleton tone={theme.tone.page} className="h-4 w-20" />
        <CardShell className="h-[420px] rounded-[24px]" />
      </div>
    </LoadingSkeleton>
  );
}

/** ログインの確認中など、画面そのものを待っている間。開こうとしている画面の形を出す */
export function AppPending() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  let body: ReactNode;
  if (path.startsWith("/plans/")) body = <PlanDetailSkeleton />;
  else if (path.startsWith("/plans")) body = <PlansSkeleton />;
  else if (path.startsWith("/analytics")) body = <InsightsSkeleton />;
  else if (path.startsWith("/expenses")) body = <ExpensesSkeleton />;
  else if (path.startsWith("/settings")) body = <SettingsSkeleton />;
  else
    body = (
      <>
        <HomeHeaderSkeleton />
        <HomeBodySkeleton />
      </>
    );
  return <main className="app-shell flex flex-col gap-5">{body}</main>;
}
