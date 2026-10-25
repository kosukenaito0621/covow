import { sql } from "drizzle-orm";
import { LOCALES } from "../../shared/i18n";
import { THEME_IDS } from "../../shared/theme";
import { check, index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/*
 * 金額は円の整数。日付は日本時間の YYYY-MM-DD、日時は UTC の ISO 8601 文字列。
 * ID は crypto.randomUUID()。
 */

const DATE_GLOB = "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]";
const MONTH_GLOB = "[0-9][0-9][0-9][0-9]-[0-9][0-9]";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  googleSub: text("google_sub").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  // 画面の言語とテーマ（アカウントに保存し、どの端末でも同じにする）
  locale: text("locale", { enum: LOCALES }).notNull().default("en"),
  theme: text("theme", { enum: THEME_IDS }).notNull().default("aurora"),
  // 体験版の仮のアカウント（24時間で消える）。guestExpiresAt を過ぎたら毎日の定期処理で消す
  isGuest: integer("is_guest", { mode: "boolean" }).notNull().default(false),
  guestExpiresAt: text("guest_expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** 体験版を作った回数（IP のハッシュ×日本時間の日付ごと）。作りすぎを防ぐ */
export const trialQuota = sqliteTable(
  "trial_quota",
  {
    key: text("key").notNull(),
    day: text("day").notNull(),
    count: integer("count").notNull(),
  },
  (t) => [primaryKey({ columns: [t.key, t.day] })],
);

export const sessions = sqliteTable(
  "sessions",
  {
    // Cookie の値そのものではなく SHA-256 のハッシュ
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const spaces = sqliteTable("spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const spaceMembers = sqliteTable(
  "space_members",
  {
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // 権限の差はない（表示用）
    role: text("role", { enum: ["owner", "member"] }).notNull(),
    joinedAt: text("joined_at").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.spaceId, t.userId] }),
    // v1 は1人1スペース
    uniqueIndex("space_members_user_unique").on(t.userId),
    check("space_members_role_check", sql`${t.role} IN ('owner','member')`),
  ],
);

export const invites = sqliteTable(
  "invites",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: text("expires_at").notNull(),
    usedAt: text("used_at"),
    usedBy: text("used_by").references(() => users.id),
    revokedAt: text("revoked_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("invites_space_idx").on(t.spaceId)],
);

export const categories = sqliteTable(
  "categories",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("categories_space_name_unique").on(t.spaceId, t.name),
    index("categories_space_order_idx").on(t.spaceId, t.sortOrder),
  ],
);

export const PLAN_STATUSES = ["planned", "purchased", "canceled"] as const;

export const purchasePlans = sqliteTable(
  "purchase_plans",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    // NULL＝ふたり
    assigneeUserId: text("assignee_user_id").references(() => users.id),
    title: text("title").notNull(),
    plannedAmount: integer("planned_amount").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    plannedDate: text("planned_date"),
    memo: text("memo"),
    productUrl: text("product_url"),
    status: text("status", { enum: PLAN_STATUSES }).notNull().default("planned"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    check("purchase_plans_amount_check", sql`${t.plannedAmount} BETWEEN 1 AND 99999999`),
    check("purchase_plans_status_check", sql`${t.status} IN ('planned','purchased','canceled')`),
    check(
      "purchase_plans_date_check",
      sql`${t.plannedDate} IS NULL OR ${t.plannedDate} GLOB ${sql.raw(`'${DATE_GLOB}'`)}`,
    ),
    index("purchase_plans_space_status_date_idx").on(t.spaceId, t.status, t.plannedDate),
    index("purchase_plans_space_created_idx").on(t.spaceId, t.createdAt),
  ],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    // UNIQUE：1つの予定から支出が2つできないことを DB で保証する
    purchasePlanId: text("purchase_plan_id")
      .unique()
      .references(() => purchasePlans.id, { onDelete: "set null" }),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    actualAmount: integer("actual_amount").notNull(),
    categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
    spentAt: text("spent_at").notNull(),
    memo: text("memo"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    check("expenses_amount_check", sql`${t.actualAmount} BETWEEN 1 AND 99999999`),
    check("expenses_date_check", sql`${t.spentAt} GLOB ${sql.raw(`'${DATE_GLOB}'`)}`),
    index("expenses_space_spent_idx").on(t.spaceId, t.spentAt),
  ],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    spaceId: text("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    budgetAmount: integer("budget_amount").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    // 将来カテゴリ別予算を足すときは category_id（NULL＝全体）を加えて UNIQUE を広げる
    uniqueIndex("budgets_space_month_unique").on(t.spaceId, t.yearMonth),
    check("budgets_amount_check", sql`${t.budgetAmount} BETWEEN 0 AND 99999999`),
    check("budgets_month_check", sql`${t.yearMonth} GLOB ${sql.raw(`'${MONTH_GLOB}'`)}`),
  ],
);
