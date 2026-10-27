import { describe, expect, it } from "vitest";
import { jstToday } from "../src/shared/date/jst";
import { join, makeInvite, makeSpace, makeUser, type TestUser } from "./helpers/users";

type SplitView = { payerUserId: string; splitUserId: string | null; payerRatio: number };
type Plan = SplitView & { id: string; status: string };
type Expense = SplitView & { id: string; purchasePlanId: string | null };

const TODAY = jstToday();
const code = async (res: Response) => (await res.json<{ code: string }>()).code;

async function pair() {
  const a = await makeUser("Aoi");
  await makeSpace(a);
  const b = await makeUser("Bo");
  await join(b, await makeInvite(a));
  return { a, b };
}

const plan = async (u: TestUser, body: Record<string, unknown> = {}) => {
  const res = await u.call("/plans", { method: "POST", body: { title: "Fridge", plannedAmount: 10000, plannedDate: TODAY, ...body } });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json<{ plan: Plan }>()).plan;
};

describe("割り勘：予定・支出の払う人と割合", () => {
  it("省けば登録した人が 100%。折半で登録すると相手と 50% が入る", async () => {
    const { a, b } = await pair();
    expect(await plan(a)).toMatchObject({ payerUserId: a.id, splitUserId: null, payerRatio: 100 });
    expect(await plan(a, { splitUserId: b.id, payerRatio: 50 })).toMatchObject({ payerUserId: a.id, splitUserId: b.id, payerRatio: 50 });
    const res = await a.call("/expenses", { method: "POST", body: { title: "Dinner", actualAmount: 6000, spentAt: TODAY, payerUserId: b.id } });
    expect((await res.json<{ expense: Expense }>()).expense).toMatchObject({ payerUserId: b.id, splitUserId: null, payerRatio: 100 });
  });

  it("メンバーでない人・おかしな割合は 422", async () => {
    const { a, b } = await pair();
    const stranger = await makeUser("Cy");
    await makeSpace(stranger);
    const bad = [
      { splitUserId: stranger.id, payerRatio: 50 },
      { payerUserId: stranger.id },
      { splitUserId: b.id, payerRatio: 55 },
      { splitUserId: b.id, payerRatio: 100 },
      { splitUserId: b.id, payerRatio: 0 },
      { payerRatio: 50 },
      { payerUserId: b.id, splitUserId: b.id, payerRatio: 50 },
    ];
    for (const body of bad) {
      const res = await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 100, ...body } });
      expect(res.status, JSON.stringify(body)).toBe(422);
    }
  });

  it("編集で割合を省けば、今の割合のまま", async () => {
    const { a, b } = await pair();
    const p = await plan(a, { splitUserId: b.id, payerRatio: 50 });
    const res = await b.call(`/plans/${p.id}`, { method: "PATCH", body: { title: "Big fridge", plannedAmount: 12000, plannedDate: TODAY } });
    expect((await res.json<{ plan: Plan }>()).plan).toMatchObject({ payerUserId: a.id, splitUserId: b.id, payerRatio: 50 });
  });

  it("買うと予定の割合が支出に引き継がれる。買うときに変えたら予定もそろう。予定に戻すと支出の割合が予定に戻る", async () => {
    const { a, b } = await pair();
    const p = await plan(a, { splitUserId: b.id, payerRatio: 50 });
    await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 9800, spentAt: TODAY } });
    let ex = (await (await a.call("/expenses")).json<{ expenses: Expense[] }>()).expenses.find((e) => e.purchasePlanId === p.id)!;
    expect(ex).toMatchObject({ payerUserId: a.id, splitUserId: b.id, payerRatio: 50 });

    const q = await plan(a);
    await a.call(`/plans/${q.id}/purchase`, { method: "POST", body: { actualAmount: 5000, spentAt: TODAY, payerUserId: a.id, splitUserId: b.id, payerRatio: 70 } });
    expect((await (await a.call(`/plans/${q.id}`)).json<{ plan: Plan }>()).plan).toMatchObject({ splitUserId: b.id, payerRatio: 70 });
    ex = (await (await a.call("/expenses")).json<{ expenses: Expense[] }>()).expenses.find((e) => e.purchasePlanId === q.id)!;
    expect(ex).toMatchObject({ payerRatio: 70 });

    // 支出の側で割合を 3:7 に変えてから予定に戻す
    await a.call(`/expenses/${ex.id}`, { method: "PATCH", body: { title: "Fridge", actualAmount: 5000, spentAt: TODAY, payerUserId: a.id, splitUserId: b.id, payerRatio: 30 } });
    await a.call(`/plans/${q.id}/unpurchase`, { method: "POST" });
    expect((await (await a.call(`/plans/${q.id}`)).json<{ plan: Plan }>()).plan).toMatchObject({ status: "planned", payerRatio: 30 });
  });

  it("相手がスペースを抜けても、記録は残り読める", async () => {
    const { a, b } = await pair();
    const p = await plan(a, { splitUserId: b.id, payerRatio: 50 });
    expect((await b.call("/space/leave", { method: "POST" })).status).toBe(204);
    const res = await a.call(`/plans/${p.id}`);
    expect(res.status).toBe(200);
    expect((await res.json<{ plan: Plan }>()).plan).toMatchObject({ splitUserId: b.id, payerRatio: 50 });
    expect(await code(await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 100, splitUserId: b.id, payerRatio: 50 } }))).toBe("INVALID_REFERENCE");
  });
});

type Summary = { budget: number | null; actualTotal: number; plannedTotal: number; remaining: number | null; upcoming: { id: string }[] };

describe("人ごとの予算と集計", () => {
  it("折半の予定は両方の予定額に半分ずつ、分けない支出は払った人だけ。表示する人は ?user= で選ぶ", async () => {
    const { a, b } = await pair();
    await a.call(`/budgets/${TODAY.slice(0, 7)}`, { method: "PUT", body: { amount: 50000 } });
    await b.call(`/budgets/${TODAY.slice(0, 7)}`, { method: "PUT", body: { amount: 40000 } });
    const shared = await plan(a, { splitUserId: b.id, payerRatio: 50, plannedAmount: 10001 });
    await a.call("/expenses", { method: "POST", body: { title: "Lunch", actualAmount: 3000, spentAt: TODAY } });

    const mine = await (await a.call("/summary")).json<Summary>();
    expect(mine).toMatchObject({ budget: 50000, actualTotal: 3000, plannedTotal: 5001, remaining: 50000 - 3000 - 5001 });
    expect(mine.upcoming.map((p) => p.id)).toEqual([shared.id]);

    const hers = await (await a.call(`/summary?user=${b.id}`)).json<Summary>();
    expect(hers).toMatchObject({ budget: 40000, actualTotal: 0, plannedTotal: 5000, remaining: 35000 });

    const days = await (await b.call(`/daily?from=${TODAY}&to=${TODAY}&user=${a.id}`)).json<{ days: { amount: number }[] }>();
    expect(days.days[0]!.amount).toBe(3000);
  });

  it("予算は自分の分だけ変わる。相手の予算は見られる。ほかのスペースの人は 404", async () => {
    const { a, b } = await pair();
    const ym = TODAY.slice(0, 7);
    await a.call(`/budgets/${ym}`, { method: "PUT", body: { amount: 50000 } });
    const list = async (u: TestUser, who?: string) =>
      (await (await u.call(`/budgets?from=${ym}&to=${ym}${who ? `&user=${who}` : ""}`)).json<{ budgets: { amount: number }[] }>()).budgets;
    expect(await list(b)).toEqual([]);
    expect((await list(b, a.id))[0]?.amount).toBe(50000);
    const stranger = await makeUser("Cy");
    await makeSpace(stranger);
    for (const path of [`/summary?user=${stranger.id}`, `/budgets?from=${ym}&to=${ym}&user=${stranger.id}`, `/insights?user=${stranger.id}`, `/daily?from=${TODAY}&to=${TODAY}&user=${stranger.id}`]) {
      expect((await a.call(path)).status, path).toBe(404);
    }
  });

  it("相手が抜けても、自分の集計は折半の自分の分のまま", async () => {
    const { a, b } = await pair();
    await plan(a, { splitUserId: b.id, payerRatio: 50 });
    await b.call("/space/leave", { method: "POST" });
    const res = await a.call("/summary");
    expect(res.status).toBe(200);
    expect((await res.json<Summary>()).plannedTotal).toBe(5000);
  });
});
