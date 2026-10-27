import { Hono } from "hono";
import { z } from "zod";
import { addDays, addMonths, isIsoDate, isYearMonth, jstThisMonth, jstToday, yearMonthOf } from "../../shared/date/jst";
import { dailySpend } from "../../shared/money/analytics";
import { forUser, involves } from "../../shared/money/split";
import { isPlannedIn, monthOverMonth, overduePlannedCount, type PlanLike, summarizeMonth } from "../../shared/money/summary";
import {
  budgetInputSchema,
  categoryInputSchema,
  categoryLocalizeSchema,
  categoryOrderSchema,
  expenseInputSchema,
  planInputSchema,
  purchaseInputSchema,
} from "../../shared/schemas";
import { parseBody, repoErrorResponse } from "../http";
import { currentSpaceId, requireMember } from "../middleware/require-member";
import { currentUser } from "../middleware/session";
import { getBudget, listBudgets, putBudget } from "../repo/budgets";
import {
  categoryUsage,
  createCategory,
  deleteCategory,
  listCategories,
  localizePresetCategories,
  reorderCategories,
  renameCategory,
} from "../repo/categories";
import { resolveViewUser } from "../repo/members";
import { createExpense, deleteExpense, listExpenses, listExpensesBetween, updateExpense } from "../repo/expenses";
import {
  createPlan,
  deletePlan,
  getPlan,
  listPlans,
  type PlanRow,
  purchasePlan,
  setPlanCanceled,
  unpurchasePlan,
  updatePlan,
} from "../repo/plans";
import type { AppEnv } from "../types";

/*
 * スペースの中身（カテゴリ・予算・購入予定・支出・ホームの集計）。すべてメンバーだけ（requireMember）。
 * 金額の計算は shared/money の関数で行い、ここでは取り出しと受け渡しだけをする。
 */

/** ?month=YYYY-MM（なければ今月・日本時間） */
const monthParam = (v: string | undefined) => (v && isYearMonth(v) ? v : v ? null : jstThisMonth());

const badQuery = (c: Parameters<typeof repoErrorResponse>[0]) =>
  c.json({ code: "VALIDATION", message: "条件を確認してください", issues: [] }, 422);

/** 予定を、金額計算の関数に渡す形にする */
const toPlanLike = (p: PlanRow): PlanLike => ({
  id: p.id,
  plannedAmount: p.plannedAmount,
  plannedDate: p.plannedDate,
  createdAt: p.createdAt,
  status: p.status,
  createdBy: p.createdBy,
});

/** URL の :id（guard を通すと型の上では空かもしれないので、空なら「ない」扱いの空文字にする） */
const idOf = (c: Parameters<typeof repoErrorResponse>[0]) => c.req.param("id") ?? "";

/** ハンドラの中で repo のエラーを決まった応答にする */
const guard =
  <A extends unknown[]>(fn: (c: Parameters<typeof repoErrorResponse>[0], ...a: A) => Promise<Response>) =>
  async (c: Parameters<typeof repoErrorResponse>[0], ...a: A) => {
    try {
      return await fn(c, ...a);
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  };

// /api 直下に置くので、ミドルウェアは自分のパスだけにかける（ほかのルートや見つからないパスに影響しないように）
const MEMBER_PATHS = ["/categories", "/categories/*", "/budgets", "/budgets/*", "/plans", "/plans/*", "/expenses", "/expenses/*", "/summary", "/daily"];
const base = new Hono<AppEnv>();
for (const p of MEMBER_PATHS) base.use(p, requireMember());

export const dataRoutes = base

  // カテゴリ
  .get("/categories", async (c) => c.json({ categories: await listCategories(c.var.db, currentSpaceId(c)) }))
  .post(
    "/categories",
    guard(async (c) => {
      const parsed = await parseBody(c, categoryInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ category: await createCategory(c.var.db, currentSpaceId(c), parsed.data.name) }, 201);
    }),
  )
  .post(
    "/categories/localize",
    guard(async (c) => {
      const parsed = await parseBody(c, categoryLocalizeSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ renamed: await localizePresetCategories(c.var.db, currentSpaceId(c), parsed.data.locale) });
    }),
  )
  .put(
    "/categories/order",
    guard(async (c) => {
      const parsed = await parseBody(c, categoryOrderSchema);
      if (!parsed.ok) return parsed.res;
      await reorderCategories(c.var.db, currentSpaceId(c), parsed.data.ids);
      return c.body(null, 204);
    }),
  )
  .patch(
    "/categories/:id",
    guard(async (c) => {
      const parsed = await parseBody(c, categoryInputSchema);
      if (!parsed.ok) return parsed.res;
      await renameCategory(c.var.db, currentSpaceId(c), idOf(c), parsed.data.name);
      return c.json({ name: parsed.data.name });
    }),
  )
  .get(
    "/categories/:id/usage",
    guard(async (c) => c.json(await categoryUsage(c.var.db, currentSpaceId(c), idOf(c)))),
  )
  .delete(
    "/categories/:id",
    guard(async (c) => {
      await deleteCategory(c.var.db, currentSpaceId(c), idOf(c));
      return c.body(null, 204);
    }),
  )

  // 予算
  // 予算は人ごと。見るのは同じスペースのだれの分でも可（?user=、省けば自分）。変えられるのは自分の分だけ
  .get(
    "/budgets",
    guard(async (c) => {
      const from = c.req.query("from");
      const to = c.req.query("to");
      if (!from || !to || !isYearMonth(from) || !isYearMonth(to) || from > to) return badQuery(c);
      const user = await resolveViewUser(c.var.db, currentSpaceId(c), currentUser(c).id, c.req.query("user"));
      return c.json({ budgets: await listBudgets(c.var.db, currentSpaceId(c), user, from, to) });
    }),
  )
  .put("/budgets/:yearMonth", async (c) => {
    const ym = c.req.param("yearMonth");
    if (!isYearMonth(ym)) return badQuery(c);
    const parsed = await parseBody(c, budgetInputSchema);
    if (!parsed.ok) return parsed.res;
    const months = await putBudget(c.var.db, currentSpaceId(c), currentUser(c).id, ym, parsed.data.amount, parsed.data.applyToFuture);
    return c.json({ months, amount: parsed.data.amount });
  })

  // 購入予定
  .get("/plans", async (c) => c.json({ plans: await listPlans(c.var.db, currentSpaceId(c)) }))
  .get(
    "/plans/:id",
    guard(async (c) => c.json({ plan: await getPlan(c.var.db, currentSpaceId(c), idOf(c)) })),
  )
  .post(
    "/plans",
    guard(async (c) => {
      const parsed = await parseBody(c, planInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ plan: await createPlan(c.var.db, currentSpaceId(c), currentUser(c).id, parsed.data) }, 201);
    }),
  )
  .patch(
    "/plans/:id",
    guard(async (c) => {
      const parsed = await parseBody(c, planInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ plan: await updatePlan(c.var.db, currentSpaceId(c), idOf(c), parsed.data) });
    }),
  )
  .post(
    "/plans/:id/purchase",
    guard(async (c) => {
      const parsed = await parseBody(c, purchaseInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ plan: await purchasePlan(c.var.db, currentSpaceId(c), currentUser(c).id, idOf(c), parsed.data) });
    }),
  )
  .post(
    "/plans/:id/unpurchase",
    guard(async (c) => c.json({ plan: await unpurchasePlan(c.var.db, currentSpaceId(c), idOf(c)) })),
  )
  .post(
    "/plans/:id/cancel",
    guard(async (c) => c.json({ plan: await setPlanCanceled(c.var.db, currentSpaceId(c), idOf(c), true) })),
  )
  .post(
    "/plans/:id/restore",
    guard(async (c) => c.json({ plan: await setPlanCanceled(c.var.db, currentSpaceId(c), idOf(c), false) })),
  )
  .delete(
    "/plans/:id",
    guard(async (c) => {
      await deletePlan(c.var.db, currentSpaceId(c), idOf(c));
      return c.body(null, 204);
    }),
  )

  // 支出
  .get("/expenses", async (c) => {
    const ym = monthParam(c.req.query("month"));
    if (!ym) return badQuery(c);
    return c.json({ expenses: await listExpenses(c.var.db, currentSpaceId(c), ym) });
  })
  .post(
    "/expenses",
    guard(async (c) => {
      const parsed = await parseBody(c, expenseInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ expense: await createExpense(c.var.db, currentSpaceId(c), currentUser(c).id, parsed.data) }, 201);
    }),
  )
  .patch(
    "/expenses/:id",
    guard(async (c) => {
      const parsed = await parseBody(c, expenseInputSchema);
      if (!parsed.ok) return parsed.res;
      return c.json({ expense: await updateExpense(c.var.db, currentSpaceId(c), idOf(c), parsed.data) });
    }),
  )
  .delete(
    "/expenses/:id",
    guard(async (c) => {
      await deleteExpense(c.var.db, currentSpaceId(c), idOf(c));
      return c.body(null, 204);
    }),
  )

  // ホームの集計（予算・実支出・予定額・残額・使用率・先月比・未購入の予定・先月以前の未購入）。
  // 見ている人（?user=、省けば自分）の予算と、その人の分（割り勘は割合で分けた額）だけで計算する
  .get(
    "/summary",
    guard(async (c) => {
      const ym = monthParam(c.req.query("month"));
      if (!ym) return badQuery(c);
      const spaceId = currentSpaceId(c);
      const user = await resolveViewUser(c.var.db, spaceId, currentUser(c).id, c.req.query("user"));
      const today = jstToday();
      const prev = addMonths(ym, -1);
      const [budget, allPlans, allExpenses] = await Promise.all([
        getBudget(c.var.db, spaceId, user, ym),
        listPlans(c.var.db, spaceId),
        listExpensesBetween(c.var.db, spaceId, `${prev}-01`, `${ym}-31`),
      ]);
      const plans = forUser(allPlans, user, "plannedAmount");
      const expenses = forUser(allExpenses, user, "actualAmount");
      const planLikes = plans.map(toPlanLike);
      const summary = summarizeMonth({ yearMonth: ym, budget, plans: planLikes, expenses });
      const mom = monthOverMonth({ yearMonth: ym, today, expenses });
      // 一覧には品物の値段のまま出す（その人の分ではなく）
      const upcoming = allPlans.filter((p) => involves(p, user) && isPlannedIn(toPlanLike(p), ym)).slice(0, 3);
      return c.json({
        ...summary,
        userId: user,
        today,
        momRatio: mom.ratio,
        overdueCount: yearMonthOf(today) === ym ? overduePlannedCount(planLikes, ym) : 0,
        upcoming,
      });
    }),
  )

  // 日ごとの実支出（最大31日）
  .get(
    "/daily",
    guard(async (c) => {
      const q = z
        .object({ from: z.string().refine(isIsoDate), to: z.string().refine(isIsoDate), user: z.string().optional() })
        .safeParse(c.req.query());
      if (!q.success || q.data.from > q.data.to || addDays(q.data.from, 30) < q.data.to) return badQuery(c);
      const user = await resolveViewUser(c.var.db, currentSpaceId(c), currentUser(c).id, q.data.user);
      const dates: string[] = [];
      for (let d = q.data.from; d <= q.data.to; d = addDays(d, 1)) dates.push(d);
      const expenses = forUser(await listExpensesBetween(c.var.db, currentSpaceId(c), q.data.from, q.data.to), user, "actualAmount");
      return c.json({ days: dailySpend({ dates, expenses }) });
    }),
  );
