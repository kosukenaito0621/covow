import type { BaseLocale } from "../i18n";

/*
 * 運営からのお知らせ。ここに書いて公開（デプロイ）すると、全員の「設定 → お知らせ」に出る。
 * - 新しいものを配列の先頭に足す。id は一度決めたら変えない（読んだかどうかの記録に使う）
 * - 本文の改行は \n。文はオーナーに見せて OK をもらってから公開する
 */
export interface NewsItem {
  /** 変えない ID（例：2026-10-26-launch） */
  id: string;
  /** 日付（YYYY-MM-DD・日本時間） */
  date: string;
  title: Record<BaseLocale, string>;
  body: Record<BaseLocale, string>;
}

export const NEWS: readonly NewsItem[] = [
  {
    id: "2026-10-26-launch",
    date: "2026-10-26",
    title: {
      en: "COVOW is live",
      ja: "COVOW を公開しました",
    },
    body: {
      en: "Thanks for using COVOW. Share what you plan to buy, record what you spent, and keep the monthly budget together.\nNew features and fixes will be posted here.",
      ja: "COVOW をご利用いただき、ありがとうございます。買う予定のもの・実際の支出・月の予算を、ふたりで共有できます。\n新しい機能や不具合の修正は、ここでお知らせします。",
    },
  },
];

/** 新しい順に並べる（同じ日付なら配列の順のまま） */
export function sortNews(items: readonly NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** まだ読んでいないお知らせの ID */
export function unreadIds(items: readonly NewsItem[], readIds: ReadonlySet<string>): Set<string> {
  return new Set(items.filter((n) => !readIds.has(n.id)).map((n) => n.id));
}
