/**
 * 日本時間（Asia/Tokyo）の日付計算。
 * Workers は UTC で動くので、「今日」「今月」はすべてここで決める。
 * 日本時間には夏時間がないため、UTC＋9時間で計算する。
 *
 * 形式：日付 YYYY-MM-DD、年月 YYYY-MM、日時 UTC の ISO 8601。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type IsoDate = string; // YYYY-MM-DD
export type YearMonth = string; // YYYY-MM

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export const isIsoDate = (s: string): boolean => {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

export const isYearMonth = (s: string): boolean => {
  const m = MONTH_RE.exec(s);
  if (!m) return false;
  const month = Number(m[2]);
  return month >= 1 && month <= 12;
};

/** UTC の日時（ISO 文字列または Date）を、日本時間の日付にする */
export const jstDateOfInstant = (instant: string | Date): IsoDate => {
  const ms = typeof instant === "string" ? Date.parse(instant) : instant.getTime();
  if (Number.isNaN(ms)) throw new RangeError("invalid instant");
  return new Date(ms + JST_OFFSET_MS).toISOString().slice(0, 10);
};

export const jstYearMonthOfInstant = (instant: string | Date): YearMonth => jstDateOfInstant(instant).slice(0, 7);

export const jstToday = (now: Date = new Date()): IsoDate => jstDateOfInstant(now);

export const jstThisMonth = (now: Date = new Date()): YearMonth => jstToday(now).slice(0, 7);

export const yearMonthOf = (date: IsoDate): YearMonth => date.slice(0, 7);

const parseYm = (ym: YearMonth): [number, number] => {
  const m = MONTH_RE.exec(ym);
  if (!m) throw new RangeError("invalid year-month");
  return [Number(m[1]), Number(m[2])];
};

const pad2 = (n: number) => String(n).padStart(2, "0");

export const addMonths = (ym: YearMonth, n: number): YearMonth => {
  const [y, m] = parseYm(ym);
  const index = y * 12 + (m - 1) + n;
  return `${Math.floor(index / 12)}-${pad2((index % 12) + 1)}`;
};

export const daysInMonth = (ym: YearMonth): number => {
  const [y, m] = parseYm(ym);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** 日本時間のその月の始まりと次の月の始まりを、UTC の ISO 文字列で返す（[start, end)） */
export const monthUtcRange = (ym: YearMonth): { start: string; end: string } => {
  const [y, m] = parseYm(ym);
  const start = Date.UTC(y, m - 1, 1) - JST_OFFSET_MS;
  const end = Date.UTC(y, m, 1) - JST_OFFSET_MS;
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
};

const dateToUtcMs = (date: IsoDate): number => {
  if (!DATE_RE.test(date)) throw new RangeError("invalid date");
  return Date.parse(`${date}T00:00:00.000Z`);
};

export const addDays = (date: IsoDate, n: number): IsoDate =>
  new Date(dateToUtcMs(date) + n * DAY_MS).toISOString().slice(0, 10);

/** その日を含む週の月曜日 */
export const weekStartOf = (date: IsoDate): IsoDate => {
  const dow = new Date(dateToUtcMs(date)).getUTCDay(); // 0=日
  return addDays(date, -((dow + 6) % 7));
};

/** 月曜から日曜までの7日 */
export const weekDates = (weekStart: IsoDate): IsoDate[] => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

export const firstDayOfMonth = (ym: YearMonth): IsoDate => `${ym}-01`;
