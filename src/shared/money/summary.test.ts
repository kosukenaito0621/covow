import { describe, expect, it } from "vitest";
import { expenseMonth, planMonth } from "./month";
import {
  type ExpenseLike,
  type PlanLike,
  monthOverMonth,
  overduePlannedCount,
  remainingAfterPlanChange,
  summarizeMonth,
} from "./summary";
import { planVsActual } from "./analytics";

const YM = "2026-10";
const CREATED = "2026-10-05T03:00:00.000Z"; // 日本時間 10/5 12:00

const plan = (id: string, amount: number, extra: Partial<PlanLike> = {}): PlanLike => ({
  id,
  plannedAmount: amount,
  plannedDate: "2026-10-20",
  createdAt: CREATED,
  status: "planned",
  ...extra,
});

const expense = (id: string, amount: number, extra: Partial<ExpenseLike> = {}): ExpenseLike => ({
  id,
  actualAmount: amount,
  spentAt: "2026-10-10",
  purchasePlanId: null,
  ...extra,
});

/** 12.1 の操作を再現するための、DB の代わりの最小限の状態 */
class Ledger {
  plans: PlanLike[] = [];
  expenses: ExpenseLike[] = [];

  addPlan(p: PlanLike) {
    this.plans.push(p);
  }
  addExpense(e: ExpenseLike) {
    this.expenses.push(e);
  }
  purchase(planId: string, actualAmount: number, spentAt: string) {
    const p = this.plans.find((x) => x.id === planId);
    if (!p || p.status !== "planned") throw new Error("not planned");
    if (this.expenses.some((e) => e.purchasePlanId === planId)) throw new Error("duplicate");
    p.status = "purchased";
    this.expenses.push(expense(`exp-${planId}`, actualAmount, { spentAt, purchasePlanId: planId }));
  }
  unpurchase(planId: string) {
    const p = this.plans.find((x) => x.id === planId);
    if (!p || p.status !== "purchased") throw new Error("not purchased");
    this.expenses = this.expenses.filter((e) => e.purchasePlanId !== planId);
    p.status = "planned";
  }
  cancel(planId: string) {
    const p = this.plans.find((x) => x.id === planId);
    if (!p || p.status !== "planned") throw new Error("not planned");
    p.status = "canceled";
  }
  editExpense(id: string, actualAmount: number) {
    const e = this.expenses.find((x) => x.id === id);
    if (!e) throw new Error("no expense");
    e.actualAmount = actualAmount;
  }
  summary(budget: number | null = 100_000, ym = YM) {
    return summarizeMonth({ yearMonth: ym, budget, plans: this.plans, expenses: this.expenses });
  }
}

describe("12.1 金額計算（月間予算 100,000円、この順に操作する）", () => {
  const l = new Ledger();
  const expectStep = (actual: number, planned: number, remaining: number) => {
    const s = l.summary();
    expect({ actual: s.actualTotal, planned: s.plannedTotal, remaining: s.remaining }).toEqual({
      actual,
      planned,
      remaining,
    });
    return s;
  };

  it("1. 初期状態", () => {
    expectStep(0, 0, 100_000);
  });
  it("2. 予定A 20,000円を登録（今月）", () => {
    l.addPlan(plan("A", 20_000));
    expectStep(0, 20_000, 80_000);
  });
  it("3. 支出B 10,000円を記録（予定なし）", () => {
    l.addExpense(expense("B", 10_000));
    expectStep(10_000, 20_000, 70_000);
  });
  it("4. 予定A を実額 18,000円で購入済みにする", () => {
    l.purchase("A", 18_000, "2026-10-21");
    expectStep(28_000, 0, 72_000);
  });
  it("5. 予定C 5,000円を登録", () => {
    l.addPlan(plan("C", 5_000));
    expectStep(28_000, 5_000, 67_000);
  });
  it("6. 予定C をキャンセル", () => {
    l.cancel("C");
    expectStep(28_000, 0, 72_000);
  });
  it("7. 支出B を 5,000円に修正", () => {
    l.editExpense("B", 5_000);
    expectStep(23_000, 0, 77_000);
  });
  it("8. 予定A を未購入に戻す", () => {
    l.unpurchase("A");
    expectStep(5_000, 20_000, 75_000);
  });
  it("9. 予定D 90,000円を登録 → −15,000（登録でき、注意が出る）", () => {
    l.addPlan(plan("D", 90_000));
    const s = expectStep(5_000, 110_000, -15_000);
    expect(s.overBudget).toBe(true);
    expect(s.overAmount).toBe(15_000);
    expect(s.usageRate).toBeCloseTo(1.15);
  });
});

describe("12.1 個別のケース", () => {
  it("予定日が来月の予定は、今月の残額に影響しない", () => {
    const s = summarizeMonth({
      yearMonth: YM,
      budget: 100_000,
      plans: [plan("N", 30_000, { plannedDate: "2026-11-01" })],
      expenses: [],
    });
    expect(s.plannedTotal).toBe(0);
    expect(s.remaining).toBe(100_000);
  });

  it("予定日が空の予定は、登録日（日本時間）の月に計上される", () => {
    // UTC 10/31 15:30 ＝ 日本時間 11/1 0:30 に登録
    const p = plan("X", 1_000, { plannedDate: null, createdAt: "2026-10-31T15:30:00.000Z" });
    expect(planMonth(p)).toBe("2026-11");
    const oct = summarizeMonth({ yearMonth: "2026-10", budget: 10_000, plans: [p], expenses: [] });
    const nov = summarizeMonth({ yearMonth: "2026-11", budget: 10_000, plans: [p], expenses: [] });
    expect(oct.plannedTotal).toBe(0);
    expect(nov.plannedTotal).toBe(1_000);
  });

  it("予定日を来月に変えると、今月の残額が戻る", () => {
    const p = plan("M", 40_000);
    expect(summarizeMonth({ yearMonth: YM, budget: 100_000, plans: [p], expenses: [] }).remaining).toBe(60_000);
    const moved = { ...p, plannedDate: "2026-11-03" };
    expect(summarizeMonth({ yearMonth: YM, budget: 100_000, plans: [moved], expenses: [] }).remaining).toBe(100_000);
  });

  it("日本時間 10/31 23:30 と 11/1 0:30 の支出が、それぞれ 10月・11月に入る", () => {
    // 支出日は日本時間の日付で保存する。登録時刻（UTC）から日付を決めるのは jstDateOfInstant の役割
    const late = expense("L", 1_000, { spentAt: "2026-10-31" });
    const early = expense("E", 2_000, { spentAt: "2026-11-01" });
    expect(expenseMonth(late)).toBe("2026-10");
    expect(expenseMonth(early)).toBe("2026-11");
    const all = [late, early];
    expect(summarizeMonth({ yearMonth: "2026-10", budget: null, plans: [], expenses: all }).actualTotal).toBe(1_000);
    expect(summarizeMonth({ yearMonth: "2026-11", budget: null, plans: [], expenses: all }).actualTotal).toBe(2_000);
  });

  it("予算が未設定の月は、残額と使用率が「未設定」（null）になる。0円として計算しない", () => {
    const s = summarizeMonth({ yearMonth: YM, budget: null, plans: [plan("A", 1_000)], expenses: [expense("B", 500)] });
    expect(s.budget).toBeNull();
    expect(s.remaining).toBeNull();
    expect(s.usageRate).toBeNull();
    expect(s.overBudget).toBe(false);
    expect(s.actualTotal).toBe(500);
    expect(s.plannedTotal).toBe(1_000);
  });

  it("予算 0 円は設定済みとして扱う（残額はマイナス、使用率は計算しない）", () => {
    const s = summarizeMonth({ yearMonth: YM, budget: 0, plans: [], expenses: [expense("B", 500)] });
    expect(s.remaining).toBe(-500);
    expect(s.usageRate).toBeNull();
    expect(s.overBudget).toBe(true);
  });

  it("予定に紐づく支出の金額を修正すると、予定と実績の差も変わる", () => {
    const plans = [plan("A", 20_000, { status: "purchased" })];
    const exps = [expense("eA", 18_000, { purchasePlanId: "A", spentAt: "2026-10-21" })];
    expect(planVsActual({ yearMonth: YM, plans, expenses: exps })).toEqual({
      count: 1,
      plannedTotal: 20_000,
      actualTotal: 18_000,
      diff: -2_000,
    });
    exps[0]!.actualAmount = 21_000;
    expect(planVsActual({ yearMonth: YM, plans, expenses: exps }).diff).toBe(1_000);
  });

  it("purchased と canceled の予定は予定額に含めない", () => {
    const s = summarizeMonth({
      yearMonth: YM,
      budget: 100_000,
      plans: [plan("P", 1_000, { status: "purchased" }), plan("C", 2_000, { status: "canceled" }), plan("A", 3_000)],
      expenses: [],
    });
    expect(s.plannedTotal).toBe(3_000);
    expect(s.plannedCount).toBe(1);
  });
});

describe("7.3 過去の月の未購入の予定", () => {
  it("過去の月の予定は今月の残額に影響せず、件数だけ数える", () => {
    const plans = [
      plan("old1", 5_000, { plannedDate: "2026-09-30" }),
      plan("old2", 5_000, { plannedDate: null, createdAt: "2026-08-10T00:00:00.000Z" }),
      plan("oldDone", 5_000, { plannedDate: "2026-09-01", status: "purchased" }),
      plan("now", 1_000),
    ];
    expect(summarizeMonth({ yearMonth: YM, budget: 10_000, plans, expenses: [] }).plannedTotal).toBe(1_000);
    expect(overduePlannedCount(plans, YM)).toBe(2);
  });
});

describe("登録フォームの「いまの残額 → 登録後」", () => {
  const base = summarizeMonth({ yearMonth: YM, budget: 100_000, plans: [plan("A", 20_000)], expenses: [] });

  it("新規登録", () => {
    expect(remainingAfterPlanChange(base, null, { amount: 30_000, yearMonth: YM })).toEqual({
      before: 80_000,
      after: 50_000,
    });
  });
  it("編集（同じ月で金額を変える）は古い金額を戻してから引く", () => {
    expect(remainingAfterPlanChange(base, plan("A", 20_000), { amount: 25_000, yearMonth: YM })).toEqual({
      before: 80_000,
      after: 75_000,
    });
  });
  it("別の月へ移すと、この月の残額は増える", () => {
    expect(remainingAfterPlanChange(base, plan("A", 20_000), { amount: 20_000, yearMonth: "2026-11" })).toEqual({
      before: 80_000,
      after: 100_000,
    });
  });
  it("予算が未設定なら null", () => {
    const s = summarizeMonth({ yearMonth: YM, budget: null, plans: [], expenses: [] });
    expect(remainingAfterPlanChange(s, null, { amount: 1, yearMonth: YM })).toBeNull();
  });
});

describe("先月の同じ日までとの比較（DeltaBadge）", () => {
  const exps = [
    expense("s1", 10_000, { spentAt: "2026-09-05" }),
    expense("s2", 5_000, { spentAt: "2026-09-25" }),
    expense("o1", 12_000, { spentAt: "2026-10-03" }),
    expense("o2", 99_000, { spentAt: "2026-10-30" }),
  ];

  it("今月は今日まで、先月は同じ日まで", () => {
    expect(monthOverMonth({ yearMonth: "2026-10", today: "2026-10-25", expenses: exps })).toEqual({
      current: 12_000,
      previous: 15_000,
      diff: -3_000,
      ratio: -0.2,
    });
  });
  it("先月にその日がなければ月末まで（3/31 → 2/28）", () => {
    const e = [expense("f", 1_000, { spentAt: "2026-02-28" }), expense("m", 2_000, { spentAt: "2026-03-31" })];
    expect(monthOverMonth({ yearMonth: "2026-03", today: "2026-03-31", expenses: e })).toMatchObject({
      current: 2_000,
      previous: 1_000,
    });
  });
  it("過去の月は月全体どうし", () => {
    expect(monthOverMonth({ yearMonth: "2026-10", today: "2026-11-02", expenses: exps })).toMatchObject({
      current: 111_000,
      previous: 15_000,
    });
  });
  it("先月が 0 円なら比率は出さない", () => {
    expect(monthOverMonth({ yearMonth: "2026-10", today: "2026-10-25", expenses: [exps[2]!] }).ratio).toBeNull();
  });
});
