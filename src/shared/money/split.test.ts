import { describe, expect, it } from "vitest";
import { forUser, involves, splitAmounts, userShare, type Split } from "./split";

describe("割合で分ける", () => {
  it.each([
    [999, 50, 500, 499],
    [1000, 30, 300, 700],
    [1000, 100, 1000, 0],
    [1, 10, 0, 1],
    [7, 70, 5, 2],
    [10, 50, 5, 5],
  ])("¥%i を払う人 %i%% → 払う人 ¥%i・相手 ¥%i（合計は元の金額）", (amount, ratio, payer, other) => {
    expect(splitAmounts(amount, ratio)).toEqual({ payer, other });
    expect(payer + other).toBe(amount);
  });

  const s: Split = { payerUserId: "a", splitUserId: "b", payerRatio: 70 };
  it("その人の分。関わらない人は 0", () => {
    expect(userShare(1000, s, "a")).toBe(700);
    expect(userShare(1000, s, "b")).toBe(300);
    expect(userShare(1000, s, "c")).toBe(0);
    expect(userShare(1000, { payerUserId: "a", splitUserId: null, payerRatio: 100 }, "a")).toBe(1000);
    expect(involves(s, "b")).toBe(true);
    expect(involves(s, "c")).toBe(false);
  });

  it("forUser は、その人の分の金額に置き換え、関わらないものを外す", () => {
    const items = [
      { id: "1", actualAmount: 1000, ...s },
      { id: "2", actualAmount: 500, payerUserId: "c", splitUserId: null, payerRatio: 100 },
    ];
    expect(forUser(items, "b", "actualAmount")).toEqual([{ id: "1", actualAmount: 300, ...s }]);
  });
});
