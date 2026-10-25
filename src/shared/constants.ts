/** スペース作成時に入れる初期カテゴリ（この順に並べる） */
export const DEFAULT_CATEGORIES = [
  "食費",
  "日用品",
  "家具・家電",
  "衣服・美容",
  "趣味・娯楽",
  "交際",
  "旅行・おでかけ",
  "その他",
] as const;

export const MAX_SPACE_MEMBERS = 2;
export const INVITE_TTL_HOURS = 72;
export const SESSION_TTL_DAYS = 30;
/** セッションの残りがこれを切ったときだけ期限を延ばす（毎回の書き込みを避ける） */
export const SESSION_RENEW_THRESHOLD_DAYS = 15;
/** 「来月以降も同じ金額にする」で作成・上書きする月数 */
export const BUDGET_FUTURE_MONTHS = 12;
export const FORMER_MEMBER_LABEL = "元メンバー";
