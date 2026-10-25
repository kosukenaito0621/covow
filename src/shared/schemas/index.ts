import { z } from "zod";
import { isIsoDate, isYearMonth } from "../date/jst";
import { AMOUNT_ERROR_MESSAGES, MAX_AMOUNT, parseAmountInput } from "../money/amount";

/*
 * フォームと API の両方で使う入力スキーマ。
 * 金額はフォームでは文字列、API では数値で届くので、どちらも受け付けて整数にする。
 */

export const LIMITS = {
  title: 80,
  memo: 500,
  url: 2048,
  categoryName: 20,
  displayName: 30,
  spaceName: 30,
} as const;

const amountField = (opts: { allowZero?: boolean } = {}) =>
  z.union([z.number(), z.string()]).transform((v, ctx) => {
    if (typeof v === "number") {
      if (!Number.isInteger(v)) {
        ctx.addIssue({ code: "custom", message: AMOUNT_ERROR_MESSAGES.invalid });
        return z.NEVER;
      }
      if (v < 0) {
        ctx.addIssue({ code: "custom", message: AMOUNT_ERROR_MESSAGES.invalid });
        return z.NEVER;
      }
      if (v === 0 && !opts.allowZero) {
        ctx.addIssue({ code: "custom", message: AMOUNT_ERROR_MESSAGES.too_small });
        return z.NEVER;
      }
      if (v > MAX_AMOUNT) {
        ctx.addIssue({ code: "custom", message: AMOUNT_ERROR_MESSAGES.too_large });
        return z.NEVER;
      }
      return v;
    }
    const r = parseAmountInput(v, opts);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: AMOUNT_ERROR_MESSAGES[r.error] });
      return z.NEVER;
    }
    return r.value;
  });

export const amountSchema = amountField();
export const budgetAmountSchema = amountField({ allowZero: true });

/** 前後の空白を取り、空白だけなら「必須」エラーにする */
const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label}を入力してください` })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, `${label}を入力してください`)
        .max(max, `${label}は${max}文字以内で入力してください`),
    );

/** 任意のテキスト。空なら null */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .nullish()
    .transform((s) => (s ?? "").trim())
    .pipe(z.string().max(max, `${label}は${max}文字以内で入力してください`))
    .transform((s) => (s === "" ? null : s));

export const isoDateSchema = z.string().refine(isIsoDate, "日付の形式が正しくありません");
export const yearMonthSchema = z.string().refine(isYearMonth, "年月の形式が正しくありません");

const optionalDate = z
  .string()
  .nullish()
  .transform((s) => (s ?? "").trim())
  .pipe(z.union([z.literal(""), isoDateSchema]))
  .transform((s) => (s === "" ? null : s));

/** http / https の URL だけを許可する（javascript: などは拒否） */
export const productUrlSchema = z
  .string()
  .nullish()
  .transform((s) => (s ?? "").trim())
  .pipe(z.string().max(LIMITS.url, "URLが長すぎます"))
  .refine((s) => {
    if (s === "") return true;
    try {
      const u = new URL(s);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, "http:// か https:// で始まるURLを入力してください")
  .transform((s) => (s === "" ? null : s));

const idSchema = z.string().min(1).max(64);
const optionalId = idSchema.nullish().transform((v) => v ?? null);

export const planInputSchema = z.object({
  title: requiredText("商品名", LIMITS.title),
  plannedAmount: amountSchema,
  categoryId: optionalId,
  plannedDate: optionalDate,
  memo: optionalText("メモ", LIMITS.memo),
  productUrl: productUrlSchema,
  /** 購入担当者。null＝ふたり */
  assigneeUserId: optionalId,
});
export type PlanInput = z.output<typeof planInputSchema>;

export const purchaseInputSchema = z.object({
  actualAmount: amountSchema,
  spentAt: isoDateSchema,
});

export const expenseInputSchema = z.object({
  title: requiredText("支出内容", LIMITS.title),
  actualAmount: amountSchema,
  spentAt: isoDateSchema,
  categoryId: optionalId,
  memo: optionalText("メモ", LIMITS.memo),
});
export type ExpenseInput = z.output<typeof expenseInputSchema>;

export const budgetInputSchema = z.object({
  amount: budgetAmountSchema,
  applyToFuture: z.boolean().default(false),
});

export const categoryInputSchema = z.object({ name: requiredText("カテゴリ名", LIMITS.categoryName) });
export const categoryOrderSchema = z.object({ ids: z.array(idSchema).min(1).max(100) });
export const profileInputSchema = z.object({ displayName: requiredText("表示名", LIMITS.displayName) });
export const spaceInputSchema = z.object({ name: requiredText("スペース名", LIMITS.spaceName) });
