import { describe, expect, it } from "vitest";
import { listMonthOf, plansForMonth } from "./month";

const p = (id: string, x: { status?: "planned" | "purchased" | "canceled"; plannedDate?: string | null; createdAt?: string; boughtOn?: string }) => ({
  id,
  status: x.status ?? "planned",
  plannedDate: x.plannedDate ?? null,
  createdAt: x.createdAt ?? "2026-10-05T03:00:00.000Z",
  purchase: x.boughtOn ? { date: x.boughtOn } : undefined,
});

describe("予定一覧の月", () => {
  it("購入済みは買った日の月、ほかは予定日の月、日付なしは登録した月（日本時間）", () => {
    expect(listMonthOf(p("a", { status: "purchased", plannedDate: "2026-10-30", boughtOn: "2026-11-02" }))).toBe("2026-11");
    expect(listMonthOf(p("b", { status: "canceled", plannedDate: "2026-09-10" }))).toBe("2026-09");
    // 10/31 20:00 UTC は日本時間 11/1
    expect(listMonthOf(p("c", { createdAt: "2026-10-31T20:00:00.000Z" }))).toBe("2026-11");
  });

  const plans = [
    p("now", { plannedDate: "2026-11-20" }),
    p("overdue", { plannedDate: "2026-10-15" }),
    p("undated", { createdAt: "2026-09-01T00:00:00.000Z" }),
    p("oldBought", { status: "purchased", plannedDate: "2026-10-01", boughtOn: "2026-10-03" }),
    p("oldCanceled", { status: "canceled", plannedDate: "2026-10-02" }),
    p("next", { plannedDate: "2026-12-01" }),
  ];

  it("今月は、今月の分に加えて、期限切れと日付なしの未購入も出す", () => {
    expect(plansForMonth(plans, "2026-11", "2026-11-01").map((x) => x.id)).toEqual(["now", "overdue", "undated"]);
  });

  it("過去・先の月は、その月の分だけ", () => {
    expect(plansForMonth(plans, "2026-10", "2026-11-01").map((x) => x.id)).toEqual(["overdue", "oldBought", "oldCanceled"]);
    expect(plansForMonth(plans, "2026-12", "2026-11-01").map((x) => x.id)).toEqual(["next"]);
  });
});
