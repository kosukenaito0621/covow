import type { BaseLocale } from "./i18n";

/** スペース作成時に入れる初期カテゴリ（この順に並べる）。作った人のデータの言語（dataLocale）で入れ、あとから名前を変えられる */
/**
 * 初期カテゴリ（スペースを作ったときに入る）。key は見本データなどから指すための名前で、DB には入らない。
 * 2026-10-26：外食・カフェを足し、衣服・美容をファッション・衣服とコスメ・美容に分けた（旧アプリの分け方に合わせる）。
 */
export const CATEGORY_PRESETS = [
  { key: "food", en: "Groceries", ja: "食費" },
  { key: "eatingOut", en: "Eating out", ja: "外食・カフェ" },
  { key: "daily", en: "Daily goods", ja: "日用品" },
  { key: "home", en: "Home & appliances", ja: "家具・家電" },
  { key: "fashion", en: "Fashion & clothing", ja: "ファッション・衣服" },
  { key: "beauty", en: "Cosmetics & beauty", ja: "コスメ・美容" },
  { key: "hobby", en: "Hobbies & fun", ja: "趣味・娯楽" },
  { key: "social", en: "Social", ja: "交際" },
  { key: "travel", en: "Travel & outings", ja: "旅行・おでかけ" },
  { key: "other", en: "Other", ja: "その他" },
] as const;
export type CategoryPresetKey = (typeof CATEGORY_PRESETS)[number]["key"];
export const presetIndex = (key: CategoryPresetKey): number => CATEGORY_PRESETS.findIndex((p) => p.key === key);

export const DEFAULT_CATEGORIES: Record<BaseLocale, readonly string[]> = {
  en: CATEGORY_PRESETS.map((p) => p.en),
  ja: CATEGORY_PRESETS.map((p) => p.ja),
};

/** 前の版の初期カテゴリ名。名前をそろえるときは、いまの初期カテゴリ（key）の名前に寄せる */
const RETIRED_PRESETS: readonly { key: CategoryPresetKey; en: string; ja: string }[] = [{ key: "fashion", en: "Clothing & beauty", ja: "衣服・美容" }];

/**
 * 初期カテゴリのままの名前のうち、もう一方の言語のものを、指定した言語の名前に置き換える一覧（自分で付けた名前は対象外）。
 * 同じ言語の前の版の名前（例：衣服・美容）は、自分で使い続けているかもしれないので変えない。
 * 置き換え先の名前がすでにあるときは、重複になるので置き換えない。
 */
export function presetRenames(names: readonly string[], to: BaseLocale): { from: string; to: string }[] {
  const taken = new Set(names);
  const out: { from: string; to: string }[] = [];
  for (const name of names) {
    const from: BaseLocale = to === "ja" ? "en" : "ja";
    const hit = [...CATEGORY_PRESETS, ...RETIRED_PRESETS].find((p) => p[from] === name);
    if (!hit) continue;
    const target = CATEGORY_PRESETS.find((p) => p.key === hit.key)![to];
    if (target === name || taken.has(target)) continue;
    taken.add(target);
    out.push({ from: name, to: target });
  }
  return out;
}

/** 1つのスペースの最大人数（DB のトリガー space_members_limit と同じ値） */
export const MAX_SPACE_MEMBERS = 4;
export const INVITE_TTL_HOURS = 72;
export const SESSION_TTL_DAYS = 30;
/** セッションの残りがこれを切ったときだけ期限を延ばす（毎回の書き込みを避ける） */
export const SESSION_RENEW_THRESHOLD_DAYS = 15;
/** 「来月以降も同じ金額にする」で作成・上書きする月数 */
export const BUDGET_FUTURE_MONTHS = 12;
export const FORMER_MEMBER_LABEL = "元メンバー";
