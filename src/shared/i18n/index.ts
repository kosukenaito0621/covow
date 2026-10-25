import { en, type MessageKey } from "./en";
import { ja } from "./ja";

/*
 * 英語／日本語の切り替え。重いライブラリは使わず、型付きの辞書と小さな関数だけで行う。
 * 金額は言語に関係なく円。日付の表記は言語に合わせる。
 */

export const LOCALES = ["en", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export type { MessageKey };

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, ja };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** 最初の言語は英語（設定で日本語に切り替えられる） */
export const DEFAULT_LOCALE: Locale = "en";

export type Params = Record<string, string | number>;

/** 文言を取り出し、{name} の形のところに値を差し込む */
export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const text = DICTS[locale][key];
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

const WEEKDAY_LETTERS: Record<Locale, readonly string[]> = {
  // 月曜はじまり
  en: ["M", "T", "W", "T", "F", "S", "S"],
  ja: ["月", "火", "水", "木", "金", "土", "日"],
};
const WEEKDAY_NAMES: Record<Locale, readonly string[]> = {
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
  ja: ["月", "火", "水", "木", "金", "土", "日"],
};

/** 曜日の1文字（index は月曜＝0） */
export const weekdayLetter = (index: number, locale: Locale) => WEEKDAY_LETTERS[locale][index] ?? "";
/** 読み上げ用の曜日名 */
export const weekdayName = (index: number, locale: Locale) => WEEKDAY_NAMES[locale][index] ?? "";

/** 読み上げ用の日付（October 27, Monday／10月27日（月）） */
export function spokenDate(date: string, weekdayIndex: number, locale: Locale): string {
  if (locale === "ja") return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日（${weekdayName(weekdayIndex, "ja")}）`;
  const md = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(parseDate(date));
  return `${weekdayName(weekdayIndex, "en")}, ${md}`;
}
