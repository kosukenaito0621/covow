import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { jstToday } from "../src/shared/date/jst";
import { makeSpace, makeUser } from "./helpers/users";

// COWEL との連携（COWEL の docs/superpowers/specs/2026-11-04-covow-sync-design.md）。
// 支出を変える処理は、同じ batch で変更の記録帳 expense_changes に1行書く。COWEL はこれを番号順に読む。
type Row = { seq: number; space_id: string; expense_id: string; op: string; payload: string | null };
const TODAY = jstToday();
const changes = async (spaceId: string) =>
  (await env.DB.prepare("SELECT seq, space_id, expense_id, op, payload FROM expense_changes WHERE space_id = ? ORDER BY seq").bind(spaceId).all<Row>()).results;
const payload = (r: Row) => JSON.parse(r.payload!) as Record<string, unknown>;

async function setup() {
  const a = await makeUser("Aoi");
  const space = await makeSpace(a);
  const cats = (await (await a.call("/categories")).json<{ categories: { id: string; name: string }[] }>()).categories;
  return { a, space, cat: cats[0]! };
}
async function addExpense(u: Awaited<ReturnType<typeof makeUser>>, body: Record<string, unknown>) {
  const res = await u.call("/expenses", { method: "POST", body: { title: "Bread", actualAmount: 1200, spentAt: TODAY, ...body } });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json<{ expense: { id: string } }>()).expense;
}

describe("変更の記録帳", () => {
  it("直接入れる・直す・消すで upsert, upsert, delete の3行が番号順に入る", async () => {
    const { a, space, cat } = await setup();
    const e = await addExpense(a, { categoryId: cat.id });
    expect((await a.call(`/expenses/${e.id}`, { method: "PATCH", body: { title: "Bread", actualAmount: 1500, spentAt: TODAY, categoryId: cat.id } })).status).toBe(200);
    expect((await a.call(`/expenses/${e.id}`, { method: "DELETE" })).status).toBe(204);
    const rows = await changes(space.id);
    expect(rows.map((r) => [r.expense_id, r.op])).toEqual([[e.id, "upsert"], [e.id, "upsert"], [e.id, "delete"]]);
    expect(rows[0]!.seq).toBeLessThan(rows[1]!.seq);
    expect(payload(rows[1]!)).toEqual({ id: e.id, actualAmount: 1500, spentAt: TODAY, title: "Bread", categoryName: cat.name, payerUserId: a.id, splitUserId: null, payerRatio: 100, recordedBy: a.id });
    expect(rows[2]!.payload).toBeNull();
  });

  it("予定から買って未購入に戻すと upsert と delete", async () => {
    const { a, space } = await setup();
    const plan = (await (await a.call("/plans", { method: "POST", body: { title: "Lamp", plannedAmount: 3000, plannedDate: TODAY } })).json<{ plan: { id: string } }>()).plan;
    expect((await a.call(`/plans/${plan.id}/purchase`, { method: "POST", body: { actualAmount: 2800, spentAt: TODAY } })).status).toBe(200);
    const expenseId = (await env.DB.prepare("SELECT id FROM expenses WHERE purchase_plan_id = ?").bind(plan.id).first<{ id: string }>())!.id;
    expect((await a.call(`/plans/${plan.id}/unpurchase`, { method: "POST" })).status).toBe(200);
    const rows = await changes(space.id);
    expect(rows.map((r) => [r.expense_id, r.op])).toEqual([[expenseId, "upsert"], [expenseId, "delete"]]);
    expect(payload(rows[0]!)).toMatchObject({ actualAmount: 2800, title: "Lamp" });
  });

  it("カテゴリの名前を変えると、そのカテゴリの支出ごとに新しい名前の upsert", async () => {
    const { a, space, cat } = await setup();
    const e1 = await addExpense(a, { categoryId: cat.id }), e2 = await addExpense(a, { title: "Milk", categoryId: cat.id });
    await addExpense(a, { title: "Other", categoryId: null });
    const before = (await changes(space.id)).length;
    expect((await a.call(`/categories/${cat.id}`, { method: "PATCH", body: { name: "Groceries2" } })).status).toBe(200);
    const added = (await changes(space.id)).slice(before);
    expect(added.map((r) => r.expense_id).sort()).toEqual([e1.id, e2.id].sort());
    expect(added.every((r) => r.op === "upsert" && payload(r).categoryName === "Groceries2")).toBe(true);
  });

  it("カテゴリを消すと、その支出は categoryName が null の upsert", async () => {
    const { a, space, cat } = await setup();
    const e = await addExpense(a, { categoryId: cat.id });
    const before = (await changes(space.id)).length;
    expect((await a.call(`/categories/${cat.id}`, { method: "DELETE" })).status).toBe(204);
    const added = (await changes(space.id)).slice(before);
    expect(added.map((r) => [r.expense_id, r.op, payload(r).categoryName])).toEqual([[e.id, "upsert", null]]);
  });

  it("言語の切り替えで初期カテゴリの名前が変わると、その支出ごとに新しい名前の upsert", async () => {
    const { a, space, cat } = await setup();
    const e = await addExpense(a, { categoryId: cat.id });
    const before = (await changes(space.id)).length;
    const res = await a.call("/categories/localize", { method: "POST", body: { locale: "ja" } });
    expect((await res.json<{ renamed: number }>()).renamed).toBeGreaterThan(0);
    const renamed = (await env.DB.prepare("SELECT name FROM categories WHERE id = ?").bind(cat.id).first<{ name: string }>())!.name;
    const added = (await changes(space.id)).slice(before);
    expect(added.map((r) => [r.expense_id, payload(r).categoryName])).toEqual([[e.id, renamed]]);
  });

  it("payload にメモ・URLが入らない", async () => {
    const { a, space } = await setup();
    await addExpense(a, { memo: "secret memo" });
    const p = payload((await changes(space.id))[0]!);
    expect(Object.keys(p).sort()).toEqual(["actualAmount", "categoryName", "id", "payerRatio", "payerUserId", "recordedBy", "spentAt", "splitUserId", "title"]);
    expect(JSON.stringify(p)).not.toContain("secret memo");
  });

  it("本体の更新が失敗したら記録帳にも残らない", async () => {
    const { a, space } = await setup();
    const before = (await changes(space.id)).length;
    expect((await a.call(`/expenses/${crypto.randomUUID()}`, { method: "PATCH", body: { title: "Ghost", actualAmount: 100, spentAt: TODAY } })).status).toBe(404);
    expect((await a.call(`/expenses/${crypto.randomUUID()}`, { method: "DELETE" })).status).toBe(404);
    expect((await changes(space.id)).length).toBe(before);
  });
});
