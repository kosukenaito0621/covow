import { en, type MessageKey } from "./en";
import { ja } from "./ja";

/*
 * 英語／日本語／Mix の切り替え。重いライブラリは使わず、型付きの辞書と小さな関数だけで行う。
 * 金額は言語に関係なく円。日付の表記は言語に合わせる（Mix は英語の表記）。
 *
 * Mix（2026-10-25 の決定・docs/superpowers/specs/2026-10-25-mix-language-design.md）：
 * 見た目の骨子（見出し・ラベル・日付・ステータス・ボタン・入力欄・エラー）は英語のまま、
 * 意味を読み取る文（MIX_JA_KEYS）だけ日本語にし、最初から入るデータ（初期カテゴリ・見本）も日本語にする。
 */

export const LOCALES = ["en", "ja", "mix"] as const;
export type Locale = (typeof LOCALES)[number];
/** 辞書を持つ言語（Mix は英語と日本語を組み合わせる） */
export type BaseLocale = "en" | "ja";
export type { MessageKey };

/** Mix で日本語にする文（意味を読み取る文）。ここに足せば Mix にだけ反映される */
export const MIX_JA_KEYS = [
  "plan.under",
  "plan.over",
  "plan.same",
  "insights.boughtFromPlans",
  "insights.trendSummary",
  "insights.dailySummary",
  "home.weekPeak",
  "attention.overBy",
  "attention.overBudgetConfirm",
  "home.overdue",
] as const satisfies readonly MessageKey[];

const mix: Record<MessageKey, string> = { ...en };
for (const k of MIX_JA_KEYS) mix[k] = ja[k];

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, ja, mix };

/** 最初から入るデータ（初期カテゴリ・見本データ）の言語。Mix は日本語 */
export const dataLocale = (locale: Locale): BaseLocale => (locale === "en" ? "en" : "ja");
/** 日付・曜日の表記の言語。Mix は英語（骨子は英語） */
export const dateLocale = (locale: Locale): BaseLocale => (locale === "ja" ? "ja" : "en");
/** 日本語にする文（MIX_JA_KEYS）の中に差し込む日付・曜日の言語。Mix は日本語 */
export const textLocale = (locale: Locale): BaseLocale => (locale === "en" ? "en" : "ja");
/** 画面の言語指定（<html lang>）。Mix は日本語の文が読み上げで正しく読まれるよう ja */
export const htmlLang = (locale: Locale): BaseLocale => (locale === "en" ? "en" : "ja");

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** 最初の言語は英語（設定で日本語に切り替えられる） */
export const DEFAULT_LOCALE: Locale = "en";

export type Params = Record<string, string | number>;

/**
 * 文言を取り出し、{name} の形のところに値を差し込む。
 * 「単数|複数」の形（英語の 1 item / 2 items）は、count が 1 なら前、それ以外なら後ろを使う。
 */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const raw = DICTS[locale][key];
  const forms = raw.split("|");
  const text = forms.length === 2 ? (params?.count === 1 ? forms[0]! : forms[1]!) : raw;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

const parseYm = (ym: string) => new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1));
const parseDate = (d: string) => new Date(`${d}T00:00:00.000Z`);

/** 年月の表記（Oct 2026／2026年10月） */
export const formatMonth = (ym: string, locale: Locale): string =>
  locale === "ja"
    ? `${Number(ym.slice(0, 4))}年${Number(ym.slice(5, 7))}月`
    : new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(parseYm(ym));

/** 月だけの短い表記（Oct／10月）。グラフの目盛りに使う */
export const formatMonthShort = (ym: string, locale: Locale): string =>
  locale === "ja"
    ? `${Number(ym.slice(5, 7))}月`
    : new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(parseYm(ym));

/** 月日の短い表記（Oct 27／10/27） */
export const formatShortDate = (date: string, locale: Locale): string =>
  locale === "ja"
    ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parseDate(date));

const WEEKDAY_LETTERS: Record<BaseLocale, readonly string[]> = {
  // 月曜はじまり
  en: ["M", "T", "W", "T", "F", "S", "S"],
  ja: ["月", "火", "水", "木", "金", "土", "日"],
};
const WEEKDAY_NAMES: Record<BaseLocale, readonly string[]> = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ja: ["月", "火", "水", "木", "金", "土", "日"],
};

/** 曜日の1文字（index は月曜＝0） */
export const weekdayLetter = (index: number, locale: Locale) => WEEKDAY_LETTERS[dateLocale(locale)][index] ?? "";
/** 読み上げ用の曜日名 */
export const weekdayName = (index: number, locale: Locale) => WEEKDAY_NAMES[dateLocale(locale)][index] ?? "";

/** 読み上げ用の日付（October 27, Monday／10月27日（月）） */
export function spokenDate(date: string, weekdayIndex: number, locale: Locale): string {
  if (locale === "ja") return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日（${weekdayName(weekdayIndex, "ja")}）`;
  const md = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(parseDate(date));
  return `${weekdayName(weekdayIndex, "en")}, ${md}`;
}
