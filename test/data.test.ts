import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { addMonths, jstThisMonth, jstToday } from "../src/shared/date/jst";
import { join, makeInvite, makeSpace, makeUser, type TestUser } from "./helpers/users";

type Plan = { id: string; status: string; title: string; categoryId: string | null; expense: { id: string; actualAmount: number; spentAt: string } | null };
type Expense = { id: string; purchasePlanId: string | null; actualAmount: number };

const code = async (res: Response) => (await res.json<{ code: string }>()).code;
const TODAY = jstToday();
const MONTH = jstThisMonth();

async function setup() {
  const a = await makeUser("Aoi");
  const space = await makeSpace(a);
  const cats = (await (await a.call("/categories")).json<{ categories: { id: string; name: string }[] }>()).categories;
  return { a, space, cats };
}

async function addPlan(u: TestUser, body: Record<string, unknown> = {}) {
  const res = await u.call("/plans", { method: "POST", body: { title: "Sofa", plannedAmount: "128,400", plannedDate: TODAY, ...body } });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json<{ plan: Plan }>()).plan;
}

const expenseCount = async (planId: string) =>
  (await env.DB.prepare("SELECT COUNT(*) AS n FROM expenses WHERE purchase_plan_id = ?").bind(planId).first<{ n: number }>())!.n;

describe("購入予定", () => {
  it("登録すると未購入。金額はカンマ付きの文字列でも整数になる。入力エラーは 422", async () => {
    const { a, cats } = await setup();
    const p = await addPlan(a, { categoryId: cats[0]!.id });
    expect(p).toMatchObject({ status: "planned", title: "Sofa", categoryId: cats[0]!.id, expense: null });
    expect((p as unknown as { plannedAmount: number }).plannedAmount).toBe(128400);
    for (const bad of [{ plannedAmount: 0 }, { plannedAmount: "1.5" }, { title: "  " }, { productUrl: "javascript:alert(1)" }]) {
      expect((await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 100, ...bad } })).status, JSON.stringify(bad)).toBe(422);
    }
  });

  it("ほかのスペースのカテゴリや、メンバーでない人を担当にはできない", async () => {
    const { a } = await setup();
    const other = await setup();
    const res = await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 100, categoryId: other.cats[0]!.id } });
    expect([res.status, await code(res)]).toEqual([422, "INVALID_REFERENCE"]);
    const res2 = await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 100, assigneeUserId: other.a.id } });
    expect([res2.status, await code(res2)]).toEqual([422, "INVALID_REFERENCE"]);
  });

  it("購入済みにすると、支出が1件できる。2回目は 409 で、支出は増えない", async () => {
    const { a } = await setup();
    const p = await addPlan(a);
    const ok = await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 120000, spentAt: TODAY } });
    expect(ok.status).toBe(200);
    expect((await ok.json<{ plan: Plan }>()).plan).toMatchObject({ status: "purchased", expense: { actualAmount: 120000, spentAt: TODAY } });
    const again = await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 1, spentAt: TODAY } });
    expect([again.status, await code(again)]).toEqual([409, "ALREADY_PURCHASED"]);
    expect(await expenseCount(p.id)).toBe(1);
  });

  it("2人が同時に「購入済みにする」を押しても、支出は1件だけ", async () => {
    const { a } = await setup();
    const b = await makeUser("Haru");
    await join(b, await makeInvite(a));
    const p = await addPlan(a);
    const body = { actualAmount: 1000, spentAt: TODAY };
    const results = await Promise.all([
      a.call(`/plans/${p.id}/purchase`, { method: "POST", body }),
      b.call(`/plans/${p.id}/purchase`, { method: "POST", body }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await expenseCount(p.id)).toBe(1);
  });

  it("キャンセル済みは購入済みにできない（409・何も変わらない）。戻せば購入できる", async () => {
    const { a } = await setup();
    const p = await addPlan(a);
    expect((await a.call(`/plans/${p.id}/cancel`, { method: "POST" })).status).toBe(200);
    const res = await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 1, spentAt: TODAY } });
    expect([res.status, await code(res)]).toEqual([409, "STATE_CONFLICT"]);
    expect(await expenseCount(p.id)).toBe(0);
    expect((await a.call(`/plans/${p.id}/cancel`, { method: "POST" })).status).toBe(409);
    expect((await a.call(`/plans/${p.id}/restore`, { method: "POST" })).status).toBe(200);
    expect((await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 1, spentAt: TODAY } })).status).toBe(200);
  });

  it("未購入に戻すと、紐づく支出が消えて未購入になる。未購入のものを戻そうとすると 409", async () => {
    const { a } = await setup();
    const p = await addPlan(a);
    await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 5000, spentAt: TODAY } });
    const res = await a.call(`/plans/${p.id}/unpurchase`, { method: "POST" });
    expect((await res.json<{ plan: Plan }>()).plan).toMatchObject({ status: "planned", expense: null });
    expect(await expenseCount(p.id)).toBe(0);
    expect((await a.call(`/plans/${p.id}/unpurchase`, { method: "POST" })).status).toBe(409);
  });

  it("購入済みの予定を削除すると、支出は残り、予定とのつながりだけ外れる", async () => {
    const { a } = await setup();
    const p = await addPlan(a);
    const bought = await (await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 5000, spentAt: TODAY } })).json<{ plan: Plan }>();
    expect((await a.call(`/plans/${p.id}`, { method: "DELETE" })).status).toBe(204);
    const row = await env.DB.prepare("SELECT purchase_plan_id AS planId, actual_amount AS amount FROM expenses WHERE id = ?")
      .bind(bought.plan.expense!.id)
      .first<{ planId: string | null; amount: number }>();
    expect(row).toEqual({ planId: null, amount: 5000 });
  });
});

describe("支出", () => {
  it("予定なしで記録できる。予定から作られた支出は一覧から消せない（409 FROM_PLAN）が、金額は直せる", async () => {
    const { a } = await setup();
    const res = await a.call("/expenses", { method: "POST", body: { title: "Lunch", actualAmount: "１，２００", spentAt: TODAY } });
    expect(res.status).toBe(201);
    const free = (await res.json<{ expense: Expense }>()).expense;
    expect(free).toMatchObject({ actualAmount: 1200, purchasePlanId: null });
    expect((await a.call(`/expenses/${free.id}`, { method: "DELETE" })).status).toBe(204);

    const p = await addPlan(a);
    const bought = await (await a.call(`/plans/${p.id}/purchase`, { method: "POST", body: { actualAmount: 5000, spentAt: TODAY } })).json<{ plan: Plan }>();
    const eid = bought.plan.expense!.id;
    const del = await a.call(`/expenses/${eid}`, { method: "DELETE" });
    expect([del.status, await code(del)]).toEqual([409, "FROM_PLAN"]);
    const edit = await a.call(`/expenses/${eid}`, { method: "PATCH", body: { title: "Sofa", actualAmount: 4800, spentAt: TODAY } });
    expect((await edit.json<{ expense: Expense }>()).expense.actualAmount).toBe(4800);
    const list = (await (await a.call(`/expenses?month=${MONTH}`)).json<{ expenses: Expense[] }>()).expenses;
    expect(list.map((e) => [e.actualAmount, e.purchasePlanId])).toEqual([[4800, p.id]]);
  });
});

describe("カテゴリと予算", () => {
  it("追加・名前の変更・並べ替え・使用件数・削除（使っていた予定は未分類になる）", async () => {
    const { a, cats } = await setup();
    const add = await a.call("/categories", { method: "POST", body: { name: "Pets" } });
    expect(add.status).toBe(201);
    const dup = await a.call("/categories", { method: "POST", body: { name: "Pets" } });
    expect([dup.status, await code(dup)]).toEqual([409, "CATEGORY_EXISTS"]);

    const all = (await (await a.call("/categories")).json<{ categories: { id: string; name: string }[] }>()).categories;
    expect(all.at(-1)?.name).toBe("Pets");
    const reversed = all.map((c) => c.id).reverse();
    expect((await a.call("/categories/order", { method: "PUT", body: { ids: reversed } })).status).toBe(204);
    expect((await (await a.call("/categories")).json<{ categories: { id: string }[] }>()).categories.map((c) => c.id)).toEqual(reversed);
    expect((await a.call("/categories/order", { method: "PUT", body: { ids: reversed.slice(1) } })).status).toBe(422);

    const target = cats[0]!;
    const p = await addPlan(a, { categoryId: target.id });
    expect(await (await a.call(`/categories/${target.id}/usage`)).json()).toEqual({ plans: 1, expenses: 0 });
    expect((await a.call(`/categories/${target.id}`, { method: "DELETE" })).status).toBe(204);
    expect((await (await a.call(`/plans/${p.id}`)).json<{ plan: Plan }>()).plan.categoryId).toBeNull();
  });

  it("予算：その月だけ／翌月から12か月先まで同じ金額に。過去の月は変えない。0円も設定できる", async () => {
    const { a } = await setup();
    const prev = addMonths(MONTH, -1);
    await a.call(`/budgets/${prev}`, { method: "PUT", body: { amount: 150000 } });
    const res = await a.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: "180,000", applyToFuture: true } });
    expect((await res.json<{ months: string[] }>()).months).toHaveLength(13);
    const list = (await (await a.call(`/budgets?from=${prev}&to=${addMonths(MONTH, 13)}`)).json<{ budgets: { yearMonth: string; amount: number }[] }>()).budgets;
    expect(list[0]).toEqual({ yearMonth: prev, amount: 150000 });
    expect(list).toHaveLength(14);
    expect(list.at(-1)?.yearMonth).toBe(addMonths(MONTH, 12));
    expect((await a.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: 0 } })).status).toBe(200);
    expect((await a.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: -1 } })).status).toBe(422);
    expect((await a.call(`/budgets/2026-13`, { method: "PUT", body: { amount: 1 } })).status).toBe(422);
  });
});

describe("ホームの集計", () => {
  it("予算 − 実支出 − 予定額 ＝ 残額。購入済みは予定額から抜けて実支出に入る", async () => {
    const { a } = await setup();
    await a.call(`/budgets/${MONTH}`, { method: "PUT", body: { amount: 100000 } });
    const p1 = await addPlan(a, { plannedAmount: 30000 });
    await addPlan(a, { plannedAmount: 20000 });
    await a.call("/expenses", { method: "POST", body: { title: "Food", actualAmount: 5000, spentAt: TODAY } });
    let s = await (await a.call(`/summary?month=${MONTH}`)).json<Record<string, unknown>>();
    expect(s).toMatchObject({ budget: 100000, actualTotal: 5000, plannedTotal: 50000, plannedCount: 2, remaining: 45000 });
    expect((s.upcoming as unknown[]).length).toBe(2);

    await a.call(`/plans/${p1.id}/purchase`, { method: "POST", body: { actualAmount: 28000, spentAt: TODAY } });
    s = await (await a.call(`/summary?month=${MONTH}`)).json<Record<string, unknown>>();
    expect(s).toMatchObject({ actualTotal: 33000, plannedTotal: 20000, remaining: 47000, usageRate: 0.53 });
  });

  it("予算が未設定なら残額と使用率は null（0円として扱わない）。先月以前の未購入を数える", async () => {
    const { a } = await setup();
    await addPlan(a, { plannedDate: `${addMonths(MONTH, -1)}-15` });
    const s = await (await a.call(`/summary?month=${MONTH}`)).json<Record<string, unknown>>();
    expect(s).toMatchObject({ budget: null, remaining: null, usageRate: null, overdueCount: 1, plannedTotal: 0 });
    const days = await (await a.call(`/daily?from=${MONTH}-01&to=${MONTH}-07`)).json<{ days: unknown[] }>();
    expect(days.days).toHaveLength(7);
    expect((await a.call(`/daily?from=${MONTH}-01&to=${addMonths(MONTH, 2)}-01`)).status).toBe(422);
  });
});

describe("権限：ほかのスペースのデータには、どのルートからも触れない", () => {
  it("スペースBの ID を使ったスペースAの人の操作は、すべて 404 で、データは変わらない", async () => {
    const A = await setup();
    const B = await setup();
    const bp = await addPlan(B.a);
    const be = (await (await B.a.call("/expenses", { method: "POST", body: { title: "B", actualAmount: 100, spentAt: TODAY } })).json<{ expense: Expense }>()).expense;
    const bc = B.cats[0]!;
    const planBody = { title: "hack", plannedAmount: 1 };
    const routes: [string, string, unknown?][] = [
      ["GET", `/plans/${bp.id}`],
      ["PATCH", `/plans/${bp.id}`, planBody],
      ["POST", `/plans/${bp.id}/purchase`, { actualAmount: 1, spentAt: TODAY }],
      ["POST", `/plans/${bp.id}/unpurchase`],
      ["POST", `/plans/${bp.id}/cancel`],
      ["POST", `/plans/${bp.id}/restore`],
      ["DELETE", `/plans/${bp.id}`],
      ["PATCH", `/expenses/${be.id}`, { title: "hack", actualAmount: 1, spentAt: TODAY }],
      ["DELETE", `/expenses/${be.id}`],
      ["PATCH", `/categories/${bc.id}`, { name: "hack" }],
      ["GET", `/categories/${bc.id}/usage`],
      ["DELETE", `/categories/${bc.id}`],
      ["DELETE", `/space/members/${B.a.id}`],
    ];
    for (const [method, path, body] of routes) {
      const res = await A.a.call(path, { method, body });
      expect(res.status, `${method} ${path}`).toBe(404);
    }
    // 一覧にも出てこない
    expect((await (await A.a.call("/plans")).json<{ plans: Plan[] }>()).plans).toHaveLength(0);
    expect((await (await A.a.call(`/expenses?month=${MONTH}`)).json<{ expenses: Expense[] }>()).expenses).toHaveLength(0);
    // B のデータはそのまま
    expect((await (await B.a.call(`/plans/${bp.id}`)).json<{ plan: Plan }>()).plan).toMatchObject({ title: "Sofa", status: "planned" });
    expect((await (await B.a.call("/categories")).json<{ categories: { id: string; name: string }[] }>()).categories[0]).toEqual(
      expect.objectContaining({ id: bc.id, name: bc.name }),
    );
    expect((await (await B.a.call(`/expenses?month=${MONTH}`)).json<{ expenses: Expense[] }>()).expenses).toHaveLength(1);
  });

  it("ログインしていなければ 401、スペースがなければ 403、別サイトからの変更は 403", async () => {
    const lone = await makeUser("Lone");
    for (const path of ["/plans", "/expenses", "/categories", "/summary", `/budgets?from=${MONTH}&to=${MONTH}`]) {
      expect((await lone.call(path)).status, path).toBe(403);
    }
    const { a } = await setup();
    const cross = await a.call("/plans", { method: "POST", body: { title: "x", plannedAmount: 1 }, origin: "https://evil.example" });
    expect(cross.status).toBe(403);
    const { exports } = await import("cloudflare:workers");
    expect((await exports.default.fetch("http://localhost:5173/api/plans")).status).toBe(401);
    // 知らないパスは 404 のまま
    expect((await a.call("/nope")).status).toBe(404);
  });
});
