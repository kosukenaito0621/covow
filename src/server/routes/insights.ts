import { Hono } from "hono";
import { addDays, addMonths, daysInMonth, isYearMonth, jstThisMonth, jstToday, yearMonthOf } from "../../shared/date/jst";
import {
  categoryBreakdown,
  dailySpend,
  memberBreakdown,
  monthlyTrend,
  planVsActual,
  shareOf,
  trendStats,
} from "../../shared/money/analytics";
import { monthOverMonth, type PlanLike, summarizeMonth } from "../../shared/money/summary";
import { listBudgets } from "../repo/budgets";
import { listCategories } from "../repo/categories";
import { listExpensesBetween } from "../repo/expenses";
import { listPlans } from "../repo/plans";
import { getSpace } from "../repo/space";
import { currentSpaceId, requireMember } from "../middleware/require-member";
import { currentUser } from "../middleware/session";
import type { AppEnv } from "../types";

/** 推移で見る月数（表示中の月を含めて） */
export const TREND_MONTHS = 6;

/*
 * 分析（概要・カテゴリ・推移・メンバー別）。4つのタブの値を1回で返す。
 * 取り出しは「その期間に入りうる行」を広めに取り、振り分けと計算はすべて shared/money の関数で行う。
 */
export const insightsRoutes = new Hono<AppEnv>().get("/", requireMember(), async (c) => {
  const q = c.req.query("month");
  const ym = q === undefined ? jstThisMonth() : isYearMonth(q) ? q : null;
  if (!ym) return c.json({ code: "VALIDATION", message: "条件を確認してください", issues: [] }, 422);

  const spaceId = currentSpaceId(c);
  const db = c.var.db;
  const today = jstToday();
  const first = addMonths(ym, -(TREND_MONTHS - 1));
  const [plans, expenses, budgets, categories, space] = await Promise.all([
    listPlans(db, spaceId),
    listExpensesBetween(db, spaceId, `${first}-01`, `${ym}-31`),
    listBudgets(db, spaceId, currentUser(c).id, first, ym),
    listCategories(db, spaceId),
    getSpace(db, spaceId),
  ]);
  const planLikes: PlanLike[] = plans.map((p) => ({
    id: p.id,
    plannedAmount: p.plannedAmount,
    plannedDate: p.plannedDate,
    createdAt: p.createdAt,
    status: p.status,
    createdBy: p.createdBy,
  }));
  const budget = budgets.find((b) => b.yearMonth === ym)?.amount ?? null;
  const summary = summarizeMonth({ yearMonth: ym, budget, plans: planLikes, expenses });

  // 日ごと：今月は今日まで、それ以外の月は月末まで
  const lastDay = yearMonthOf(today) === ym ? Number(today.slice(8)) : daysInMonth(ym);
  const dates = Array.from({ length: lastDay }, (_, i) => addDays(`${ym}-01`, i));

  const cats = categoryBreakdown({ yearMonth: ym, expenses, categories });
  const trend = monthlyTrend({
    endYearMonth: ym,
    months: TREND_MONTHS,
    expenses,
    budgets: budgets.map((b) => ({ yearMonth: b.yearMonth, budgetAmount: b.amount })),
  });
  // 途中の月（今月）は平均から外す。過去の月を見ているときは外さない
  const stats = trendStats(trend, yearMonthOf(today) === ym ? ym : "");
  const names = new Map(space.members.map((m) => [m.id, m.displayName]));
  const members = memberBreakdown({ yearMonth: ym, memberIds: space.members.map((m) => m.id), expenses, plans: planLikes });

  return c.json({
    yearMonth: ym,
    actual: summary.actualTotal,
    budget: summary.budget,
    usageRate: summary.usageRate,
    used: summary.actualTotal + summary.plannedTotal,
    momRatio: monthOverMonth({ yearMonth: ym, today, expenses }).ratio,
    planVsActual: planVsActual({ yearMonth: ym, plans: planLikes, expenses }),
    daily: dailySpend({ dates, expenses }),
    dailySelected: Math.max(0, dates.length - 1),
    categories: cats.rows.map((r) => ({ key: r.categoryId ?? "none", categoryId: r.categoryId, name: r.name, amount: r.amount, ratio: r.ratio })),
    categoryTotal: cats.total,
    trend,
    trendAverage: stats.average,
    trendOverCount: stats.overCount,
    members: members.map((m) => ({
      id: m.userId,
      name: m.userId ? (names.get(m.userId) ?? "") : "",
      amount: m.amount,
      ratio: shareOf(m.amount, summary.actualTotal),
      planCount: m.planCount,
    })),
    memberCount: space.members.length,
  });
});
