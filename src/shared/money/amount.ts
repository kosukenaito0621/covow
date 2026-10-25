/** 金額の上限（円）。DB の CHECK 制約と同じ値 */
export const MAX_AMOUNT = 99_999_999;

export type AmountError = "required" | "invalid" | "too_small" | "too_large";
export type AmountParseResult = { ok: true; value: number } | { ok: false; error: AmountError };

export const AMOUNT_ERROR_MESSAGES: Record<AmountError, string> = {
  required: "金額を入力してください",
  invalid: "金額は整数（円）で入力してください",
  too_small: "1円以上で入力してください",
  too_large: "99,999,999円以下で入力してください",
};

const toHalfWidth = (s: string) =>
  s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/[，、]/g, ",");

/**
 * 金額の入力を円の整数にする。
 * 受け付ける：半角・全角の数字、桁区切りのカンマ、先頭の ¥ / ￥、前後の空白。
 * 拒否する：空欄、0円（allowZero 以外）、負の数、小数、数字以外の文字、上限超え。
 */
export const parseAmountInput = (raw: string, opts: { allowZero?: boolean } = {}): AmountParseResult => {
  const s = toHalfWidth(raw).trim().replace(/^[¥￥]/, "").trim();
  if (s === "") return { ok: false, error: "required" };
  // 桁区切りは「数字の後のカンマ＋数字」だけを認める（1,,000 や ,100 は拒否）
  if (!/^\d+(,\d+)*$/.test(s)) return { ok: false, error: "invalid" };
  const digits = s.replace(/,/g, "");
  if (digits.length > 9) return { ok: false, error: "too_large" };
  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return { ok: false, error: "invalid" };
  if (value > MAX_AMOUNT) return { ok: false, error: "too_large" };
  if (value === 0 && !opts.allowZero) return { ok: false, error: "too_small" };
  return { ok: true, value };
};

const yenFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" });
const intFormatter = new Intl.NumberFormat("ja-JP");

export const formatYen = (amount: number): string => yenFormatter.format(amount);

export const formatNumber = (amount: number): string => intFormatter.format(amount);

/**
 * ピル用の短い表示（例：128,400 → 12.8万）。多く見せないよう切り捨てる。
 * 正確な金額は aria-label と詳細に出すこと。
 */
export const formatYenShort = (amount: number): string => {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  if (abs < 10_000) return sign + intFormatter.format(abs);
  if (abs < 1_000_000) {
    const tenths = Math.floor(abs / 1_000); // 0.1万単位
    const text = tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
    return `${sign}${text}万`;
  }
  return `${sign}${Math.floor(abs / 10_000)}万`;
};
