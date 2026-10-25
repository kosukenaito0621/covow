import type { BaseLocale } from "./i18n";

/** スペース作成時に入れる初期カテゴリ（この順に並べる）。作った人のデータの言語（dataLocale）で入れ、あとから名前を変えられる */
export const DEFAULT_CATEGORIES: Record<BaseLocale, readonly string[]> = {
  en: ["Groceries", "Daily goods", "Home & appliances", "Clothing & beauty", "Hobbies & fun", "Social", "Travel & outings", "Other"],
  ja: ["食費", "日用品", "家具・家電", "衣服・美容", "趣味・娯楽", "交際", "旅行・おでかけ", "その他"],
};

/** 1つのスペースの最大人数（DB のトリガー space_members_limit と同じ値） */
export const MAX_SPACE_MEMBERS = 4;
export const INVITE_TTL_HOURS = 72;
export const SESSION_TTL_DAYS = 30;
/** セッションの残りがこれを切ったときだけ期限を延ばす（毎回の書き込みを避ける） */
export const SESSION_RENEW_THRESHOLD_DAYS = 15;
/** 「来月以降も同じ金額にする」で作成・上書きする月数 */
export const BUDGET_FUTURE_MONTHS = 12;
export const FORMER_MEMBER_LABEL = "元メンバー";
