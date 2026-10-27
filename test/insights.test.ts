import { describe, expect, it } from "vitest";
import { addMonths, jstThisMonth, jstToday } from "../src/shared/date/jst";
import { join, makeInvite, makeSpace, makeUser, type TestUser } from "./helpers/users";

type Insights = {
  yearMonth: string;
  actual: number;
  budget: number | null;
  usageRate: number | null;
  used: number;
  planVsActual: { count: number; plannedTotal: number; actualTotal: number; diff: number };
  daily: { date: string; amount: number }[];
  categories: { categoryId: string | null; name: string; amount: number; ratio: number }[];
  categoryTotal: number;
  trend: { yearMonth: string; actual: number; budget: number | null }[];
  trendAverage: number | null;
  trendOverCount: number;
  members: { id: string | null; name: string; amount: number; ratio: number; planCount: number; budget: number | null }[];
  memberCount: number;
};

const MONTH = jstThisMonth();
const TODAY = jstToday();
const prev = (n: number) => addMonths(MONTH, -n);

const spend = (u: TestUser, amount: number, spentAt: string, categoryId: string | null = null) =>
  u.call("/expenses", { method: "POST", body: { title: "x", actualAmount: amount, spentAt, categoryId } });

describe("分析", () => {
  it("概要・カテゴリ・推移は見ている人の分、メンバー別は全員の分を、shared/money の計算どおりに返す", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    await makeSpace(a);
    await join(b, await makeInvite(a));
    const cats = (await (await a.call("/categories")).json<{ categories: { id: string; name: string }[] }>()).categories;
    const food = cats[0]!;
    const daily = cats[1]!;

    // 予算は人ごと：Aoi の今月 100,000、2か月前 50,000。Haru は今月 80,000
    await a.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: 100000 } });
    await a.call(`/budgets/${prev(2)}`, { method: "PUT", body: { amount: 50000 } });
    await b.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: 80000 } });

    // 今月の支出：Aoi 食費 6,000＋未分類 1,000、Haru 日用品 3,000
    await spend(a, 6000, TODAY, food.id);
    await spend(a, 1000, TODAY);
    await spend(b, 3000, TODAY, daily.id);
    // 過去の月
    await spend(a, 40000, `${prev(1)}-10`, food.id);
    await spend(b, 60000, `${prev(2)}-10`, food.id);

    // 予定から買ったもの：予定 12,000 → 実際 10,000（今月）
    const plan = (await (await a.call("/plans", { method: "POST", body: { title: "Grinder", plannedAmount: 12000, plannedDate: TODAY } })).json<{ plan: { id: string } }>()).plan;
    await a.call(`/plans/${plan.id}/purchase`, { method: "POST", body: { actualAmount: 10000, spentAt: TODAY } });
    // 未購入の予定 5,000（使用率に入る）
    await b.call("/plans", { method: "POST", body: { title: "Rug", plannedAmount: 5000, plannedDate: TODAY } });

    const res = await a.call(`/insights?month=${MONTH}`);
    expect(res.status).toBe(200);
    const d = await res.json<Insights>();

    // 概要（Aoi の分。Haru の 3,000 と未購入の 5,000 は入らない）
    expect(d.actual).toBe(17000);
    expect(d.budget).toBe(100000);
    expect(d.used).toBe(17000);
    expect(d.usageRate).toBe(0.17);
    expect(d.planVsActual).toEqual({ count: 1, plannedTotal: 12000, actualTotal: 10000, diff: -2000 });
    expect(d.daily).toHaveLength(Number(TODAY.slice(8)));
    expect(d.daily.at(-1)).toEqual({ date: TODAY, amount: 17000 });

    // カテゴリ：金額の大きい順、合計
    expect(d.categoryTotal).toBe(17000);
    expect(d.categories.map((c) => [c.categoryId, c.amount])).toEqual([
      [null, 11000], // 未分類 1,000 ＋ 予定から買った 10,000（予定にカテゴリなし）
      [food.id, 6000],
    ]);

    // 推移：6か月、古い順。2か月前の 60,000 は Haru の分なので Aoi には入らない。平均は途中の今月を除く（5か月）
    expect(d.trend).toHaveLength(6);
    expect(d.trend.at(-1)).toEqual({ yearMonth: MONTH, actual: 17000, budget: 100000 });
    expect(d.trend.at(-3)).toEqual({ yearMonth: prev(2), actual: 0, budget: 50000 });
    expect(d.trendOverCount).toBe(0);
    expect(d.trendAverage).toBe(Math.round(40000 / 5));

    // Haru の分を見る
    const h = await (await a.call(`/insights?month=${MONTH}&user=${b.id}`)).json<Insights>();
    expect([h.actual, h.budget, h.used]).toEqual([3000, 80000, 8000]);
    expect(h.trend.at(-3)).toMatchObject({ actual: 60000, budget: null });

    // メンバー別：払った人（割り勘はその人の分）ごと、全員の中での割合、その人の予算、その月に関わる予定の数
    expect(d.memberCount).toBe(2);
    const byName = Object.fromEntries(d.members.map((m) => [m.name, m]));
    expect(byName.Aoi).toMatchObject({ amount: 17000, ratio: 0.85, planCount: 1, budget: 100000 });
    expect(byName.Haru).toMatchObject({ amount: 3000, ratio: 0.15, planCount: 1, budget: 80000 });
  });

  it("外れたメンバーの記録は「元メンバー」（id: null）にまとまる", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    await makeSpace(a);
    await join(b, await makeInvite(a));
    await spend(b, 2500, TODAY);
    await a.call(`/space/members/${b.id}`, { method: "DELETE" });
    const d = await (await a.call("/insights")).json<Insights>();
    expect(d.memberCount).toBe(1);
    expect(d.members.find((m) => m.id === null)).toMatchObject({ amount: 2500, ratio: 1 });
  });

  it("ほかのスペースの支出は入らない。未所属は 403、月の形が違えば 422", async () => {
    const a = await makeUser("Aoi");
    await makeSpace(a);
    const other = await makeUser("Other");
    await makeSpace(other);
    await spend(other, 99999, TODAY);
    const d = await (await a.call("/insights")).json<Insights>();
    expect(d.actual).toBe(0);
    expect(d.trendAverage).toBe(0);
    expect((await (await makeUser("Lone")).call("/insights")).status).toBe(403);
    expect((await a.call("/insights?month=2026-13")).status).toBe(422);
  });
});
