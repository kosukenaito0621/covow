import { describe, expect, it } from "vitest";
import { budgetInputSchema, expenseInputSchema, planInputSchema } from "./index";

const base = { title: "ソファ", plannedAmount: "128,400" };

const firstError = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? null : { path: r.error!.issues[0]!.path.join("."), message: r.error!.issues[0]!.message };

describe("購入予定の入力（12.3）", () => {
  it("正しい入力を整える（金額は整数、空の任意項目は null）", () => {
    const r = planInputSchema.parse({ ...base, memo: "  ", productUrl: "", plannedDate: "" });
    expect(r).toEqual({
      title: "ソファ",
      plannedAmount: 128_400,
      categoryId: null,
      plannedDate: null,
      memo: null,
      productUrl: null,
      assigneeUserId: null,
    });
  });

  it.each([
    ["0", "1円以上で入力してください"],
    ["100000000", "99,999,999円以下で入力してください"],
    ["-1", "金額は整数（円）で入力してください"],
    ["1.5", "金額は整数（円）で入力してください"],
    ["", "金額を入力してください"],
    ["abc", "金額は整数（円）で入力してください"],
  ])("金額 %s は拒否する", (amount, message) => {
    expect(firstError(planInputSchema.safeParse({ ...base, plannedAmount: amount }))).toEqual({
      path: "plannedAmount",
      message,
    });
  });

  it.each([1, 99_999_999, "１，０００", "¥5,000"])("金額 %s は受け付ける", (amount) => {
    expect(planInputSchema.safeParse({ ...base, plannedAmount: amount }).success).toBe(true);
  });

  it("API から数値で届いた小数・負数・0・上限超えも拒否する", () => {
    for (const v of [1.5, -1, 0, 100_000_000]) {
      expect(planInputSchema.safeParse({ ...base, plannedAmount: v }).success).toBe(false);
    }
  });

  it("商品名が空白だけ・長すぎるときは拒否する", () => {
    expect(firstError(planInputSchema.safeParse({ ...base, title: "　 \t" }))?.message).toBe("商品名を入力してください");
    expect(firstError(planInputSchema.safeParse({ ...base, title: "あ".repeat(81) }))?.message).toBe(
      "商品名は80文字以内で入力してください",
    );
    expect(planInputSchema.parse({ ...base, title: "あ".repeat(80) }).title).toHaveLength(80);
  });

  it("URL は http / https だけ許可する", () => {
    expect(planInputSchema.parse({ ...base, productUrl: "https://example.com/item?id=1" }).productUrl).toBe(
      "https://example.com/item?id=1",
    );
    for (const url of ["javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,x", "ftp://example.com", "example.com"]) {
      expect(planInputSchema.safeParse({ ...base, productUrl: url }).success).toBe(false);
    }
  });

  it("予定日は実在する日付だけ", () => {
    expect(planInputSchema.safeParse({ ...base, plannedDate: "2026-02-29" }).success).toBe(false);
    expect(planInputSchema.safeParse({ ...base, plannedDate: "2028-02-29" }).success).toBe(true);
    expect(planInputSchema.safeParse({ ...base, plannedDate: "2026/10/01" }).success).toBe(false);
  });
});

describe("支出・予算の入力", () => {
  it("支出は支出日が必須", () => {
    expect(expenseInputSchema.safeParse({ title: "スーパー", actualAmount: 3000 }).success).toBe(false);
    expect(expenseInputSchema.parse({ title: "スーパー", actualAmount: "3000", spentAt: "2026-10-25" }).actualAmount).toBe(3000);
  });
  it("予算は 0 円を受け付け、上限を超えると拒否する", () => {
    expect(budgetInputSchema.parse({ amount: "0" })).toEqual({ amount: 0, applyToFuture: false });
    expect(budgetInputSchema.safeParse({ amount: 100_000_000 }).success).toBe(false);
  });
});
