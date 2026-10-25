/*
 * 伴走ガイド「Let's Try」（旧称：やってみましょう）のミッション。
 * 案内文は言語の設定に関係なく日本語（2026-10-25 の決定）。です・ます調で簡潔に、プロフェッショナルな印象にする。
 * target は画面の data-tour の値（光る枠で囲む場所）。event は、その操作が終わったときに届く合図。
 */

export type TourEvent =
  | "plan-created"
  | "plan-purchased"
  | "expense-created"
  | "day-selected"
  | "budget-saved"
  | "partner-visited"
  | "insights-switched"
  | "theme-changed";

export interface Mission {
  id: string;
  title: string;
  body: string;
  /** 「始める」で移る画面 */
  to: "/" | "/plans" | "/expenses" | "/settings" | "/analytics";
  /** 画面ごとに光らせる場所（最初に見つかったもの） */
  targets: string[];
  event: TourEvent;
  /** 体験版だけのミッション（メンバー役がいるとき） */
  trialOnly?: boolean;
  /** コーチの中に出すボタン（押すとその場で操作する） */
  action?: { label: string };
}

export const MISSIONS: readonly Mission[] = [
  {
    id: "add-plan",
    title: "購入予定を登録しましょう",
    body: "右下の＋から、買う予定のものを登録します。見本の内容が入っていますので、そのまま登録できます。",
    to: "/",
    targets: ["add-plan", "plan-submit"],
    event: "plan-created",
  },
  {
    id: "purchase",
    title: "購入済みにしましょう",
    body: "予定の詳細で「買った」を押し、実際に支払った金額を記録します。予定額が実支出に置き換わります。",
    to: "/plans",
    targets: ["purchase-submit", "mark-bought", "plan-row"],
    event: "plan-purchased",
  },
  {
    id: "expense",
    title: "予定外の支出を記録しましょう",
    body: "支出一覧の＋から、予定になかった買い物を記録します。",
    to: "/expenses",
    targets: ["expense-submit", "add-expense"],
    event: "expense-created",
  },
  {
    id: "week",
    title: "今週の支出を確認しましょう",
    body: "ホームの曜日を押すと、その日の支出額が曲線の上に表示されます。",
    to: "/",
    targets: ["day-chips"],
    event: "day-selected",
  },
  {
    id: "budget",
    title: "予算を設定しましょう",
    body: "設定の「予算」で今月の金額を決めます。ホームの使用率に反映されます。",
    to: "/settings",
    targets: ["budget-submit", "budget-row"],
    event: "budget-saved",
  },
  {
    id: "insights",
    title: "分析を切り替えましょう",
    body: "分析では、概要・カテゴリ・推移を切り替えて、お金の使い方を振り返ります。上のタブを押してください。",
    to: "/analytics",
    targets: ["insights-tabs"],
    event: "insights-switched",
  },
  {
    id: "partner",
    title: "一緒に使いましょう",
    body: "メンバー役のはるさんを呼ぶと、予定を1つ追加します。同じスペースの予定が共有されることを、予定一覧で確認できます。",
    to: "/plans",
    targets: [],
    event: "partner-visited",
    trialOnly: true,
    action: { label: "はるさんを呼ぶ" },
  },
  {
    id: "theme",
    title: "テーマを変えましょう",
    body: "設定の「テーマ」から、好みの見た目を選びます。",
    to: "/settings",
    targets: ["theme-picker"],
    event: "theme-changed",
  },
];

/** 操作が終わったことをガイドに知らせる（ガイドが動いていなければ何も起きない） */
export function tourEvent(event: TourEvent) {
  window.dispatchEvent(new CustomEvent("covow-tour", { detail: event }));
}
