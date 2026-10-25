import { describe, expect, it } from "vitest";
import { categoryBreakdown, dailySpend, memberBreakdown, monthlyTrend, trendStats } from "./analytics";
import type { ExpenseLike } from "./summary";

const e = (id: string, amount: number, spentAt: string, extra: Partial<ExpenseLike> = {}): ExpenseLike => ({
  id,
  actualAmount: amount,
  spentAt,
  purchasePlanId: null,
  ...extra,
});

describe("カテゴリ別", () => {
  it("金額の大きい順。未分類・削除されたカテゴリは「未分類」にまとめる。合計 100%", () => {
    const cats = [
      { id: "food", name: "食費" },
      { id: "home", name: "日用品" },
    ];
    const exps = [
      e("1", 3_000, "2026-10-01", { categoryId: "food" }),
      e("2", 1_000, "2026-10-02", { categoryId: "home" }),
      e("3", 500, "2026-10-03", { categoryId: null }),
      e("4", 500, "2026-10-03", { categoryId: "deleted" }),
      e("5", 9_999, "2026-09-30", { categoryId: "food" }),
    ];
    const r = categoryBreakdown({ yearMonth: "2026-10", expenses: exps, categories: cats });
    expect(r.total).toBe(5_000);
    expect(r.rows).toEqual([
      { categoryId: "food", name: "食費", amount: 3_000, ratio: 0.6 },
      { categoryId: "home", name: "日用品", amount: 1_000, ratio: 0.2 },
      { categoryId: null, name: "未分類", amount: 1_000, ratio: 0.2 },
    ]);
  });
  it("支出がない月は空", () => {
    expect(categoryBreakdown({ yearMonth: "2026-10", expenses: [], categories: [] })).toEqual({ total: 0, rows: [] });
  });
});

describe("月別推移", () => {
  it("直近6か月の実支出と予算（未設定は null）", () => {
    const r = monthlyTrend({
      endYearMonth: "2026-10",
      months: 3,
      expenses: [e("1", 1_000, "2026-08-31"), e("2", 2_000, "2026-10-01"), e("3", 7, "2026-11-01")],
      budgets: [{ yearMonth: "2026-10", budgetAmount: 50_000 }],
    });
    expect(r).toEqual([
      { yearMonth: "2026-08", actual: 1_000, budget: null },
      { yearMonth: "2026-09", actual: 0, budget: null },
      { yearMonth: "2026-10", actual: 2_000, budget: 50_000 },
    ]);
  });
});

describe("ふたり", () => {
  it("記録した人ごとの実支出と、登録した予定の数。外れた人は「元メンバー」にまとめる", () => {
    const r = memberBreakdown({
      yearMonth: "2026-10",
      memberIds: ["u1", "u2"],
      expenses: [
        e("1", 1_000, "2026-10-01", { recordedBy: "u1" }),
        e("2", 2_000, "2026-10-02", { recordedBy: "u2" }),
        e("3", 300, "2026-10-02", { recordedBy: "gone" }),
      ],
      plans: [
        { id: "p1", plannedAmount: 1, plannedDate: "2026-10-05", createdAt: "2026-10-01T00:00:00.000Z", status: "planned", createdBy: "u1" },
        { id: "p2", plannedAmount: 1, plannedDate: "2026-10-06", createdAt: "2026-10-01T00:00:00.000Z", status: "canceled", createdBy: "u1" },
        { id: "p3", plannedAmount: 1, plannedDate: "2026-11-06", createdAt: "2026-10-01T00:00:00.000Z", status: "planned", createdBy: "u2" },
      ],
    });
    expect(r).toEqual([
      { userId: "u1", amount: 1_000, planCount: 2 },
      { userId: "u2", amount: 2_000, planCount: 0 },
      { userId: null, amount: 300, planCount: 0 },
    ]);
  });
});

describe("日別の実支出（SpendCurve）", () => {
  it("指定した日付ごとの合計。記録のない日は 0", () => {
    expect(
      dailySpend({
        dates: ["2026-10-19", "2026-10-20", "2026-10-21"],
        expenses: [e("1", 100, "2026-10-19"), e("2", 250, "2026-10-19"), e("3", 900, "2026-10-21"), e("4", 1, "2026-10-22")],
      }),
    ).toEqual([
      { date: "2026-10-19", amount: 350 },
      { date: "2026-10-20", amount: 0 },
      { date: "2026-10-21", amount: 900 },
    ]);
  });
});

describe("trendStats", () => {
  const trend = [
    { yearMonth: "2026-08", actual: 100_000, budget: 90_000 },
    { yearMonth: "2026-09", actual: 50_001, budget: null },
    { yearMonth: "2026-10", actual: 10_000, budget: 5_000 },
  ];
  it("途中の月を除いて平均し、予算オーバーは途中の月も数える", () => {
    expect(trendStats(trend, "2026-10")).toEqual({ average: 75_001, overCount: 2 });
  });
  it("終わった月がなければ平均は null", () => {
    expect(trendStats([trend[2]!], "2026-10")).toEqual({ average: null, overCount: 1 });
  });
});
