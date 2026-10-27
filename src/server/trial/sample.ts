import { CATEGORY_PRESETS, type CategoryPresetKey } from "../../shared/constants";
import { addDays, addMonths, type IsoDate, yearMonthOf } from "../../shared/date/jst";
import type { BaseLocale } from "../../shared/i18n";

/*
 * 体験版の見本のスペース。数か月使い込んだように見える架空のデータ（実在の人・店・実データは使わない）。
 * 毎回同じ並びの「乱数」を使い、今日の日付に合わせてずらすだけなので、結果はいつも同じ形になる。
 */

type Text = Record<BaseLocale, string>;

export const SAMPLE_NAMES = {
  you: { en: "Guest", ja: "ゲスト" },
  partner: { en: "Haru", ja: "はる" },
  space: { en: "Our home", ja: "ふたりの家" },
} satisfies Record<string, Text>;

// カテゴリは初期カテゴリの key で指す（shared/constants の CATEGORY_PRESETS）
const EXPENSE_ITEMS: { cat: CategoryPresetKey; min: number; max: number; text: Text }[] = [
  { cat: "food", min: 1800, max: 6800, text: { en: "Groceries", ja: "スーパーで買い物" } },
  { cat: "food", min: 900, max: 2400, text: { en: "Bakery", ja: "パン屋" } },
  { cat: "eatingOut", min: 2400, max: 7800, text: { en: "Dinner out", ja: "外食" } },
  { cat: "daily", min: 600, max: 3200, text: { en: "Household supplies", ja: "日用品のまとめ買い" } },
  { cat: "daily", min: 400, max: 1600, text: { en: "Drugstore", ja: "ドラッグストア" } },
  { cat: "beauty", min: 3000, max: 9800, text: { en: "Haircut", ja: "美容院" } },
  { cat: "hobby", min: 1200, max: 4800, text: { en: "Books", ja: "本" } },
  { cat: "hobby", min: 1800, max: 3600, text: { en: "Movie", ja: "映画" } },
  { cat: "social", min: 3000, max: 8000, text: { en: "Gift for a friend", ja: "友人へのプレゼント" } },
  { cat: "travel", min: 2000, max: 12000, text: { en: "Day trip", ja: "日帰りのおでかけ" } },
];

interface SamplePlan {
  text: Text;
  amount: number;
  cat: CategoryPresetKey;
  /** 今日からの日数（null＝日付なし） */
  dayOffset: number | null;
  status: "planned" | "purchased" | "canceled";
  /** 購入済みのときの実際の金額 */
  paid?: number;
  byPartner?: boolean;
  /** ふたりで折半（5:5）にする見本 */
  split?: boolean;
  memo?: Text;
}

const PLANS: SamplePlan[] = [
  { text: { en: "Dining chairs (pair)", ja: "ダイニングチェア（2脚）" }, amount: 28000, cat: "home", dayOffset: 3, status: "planned", split: true, memo: { en: "Oak, the lighter finish.", ja: "オーク材の明るい色" } },
  { text: { en: "Humidifier", ja: "加湿器" }, amount: 9800, cat: "home", dayOffset: 6, status: "planned", byPartner: true },
  { text: { en: "Winter rug", ja: "冬用のラグ" }, amount: 12800, cat: "home", dayOffset: null, status: "planned" },
  { text: { en: "Birthday gift for Mom", ja: "母の誕生日プレゼント" }, amount: 8000, cat: "social", dayOffset: -40, status: "planned", byPartner: true },
  { text: { en: "Coffee grinder", ja: "コーヒーミル" }, amount: 12000, cat: "daily", dayOffset: -12, status: "purchased", paid: 10780, byPartner: true },
  { text: { en: "Bookshelf", ja: "本棚" }, amount: 15000, cat: "home", dayOffset: -20, status: "purchased", paid: 16480, split: true },
  { text: { en: "Second monitor", ja: "サブモニター" }, amount: 32000, cat: "hobby", dayOffset: -8, status: "canceled" },
];

/** 「メンバー役を呼ぶ」で、はるさんが追加しに来る予定 */
export const PARTNER_VISIT_PLAN = {
  text: { en: "Bath towels", ja: "バスタオル" } satisfies Text,
  amount: 4800,
  cat: "daily" as CategoryPresetKey,
  dayOffset: 4,
};

/** 決まった並びの乱数（同じ seed なら同じ並び） */
function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export interface SampleInput {
  d1: D1Database;
  /** データの言語（Mix のときは ja を渡す） */
  locale: BaseLocale;
  today: IsoDate;
  now: string;
  youId: string;
  partnerId: string;
  spaceId: string;
}

/** 見本のスペースを作る SQL（カテゴリ・予算・支出・予定）。users と spaces・space_members は呼び出し側で作る */
export function sampleStatements({ d1, locale, today, now, youId, partnerId, spaceId }: SampleInput): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = [];
  const catIds = Object.fromEntries(CATEGORY_PRESETS.map((p) => [p.key, crypto.randomUUID()])) as Record<CategoryPresetKey, string>;
  CATEGORY_PRESETS.forEach((preset, i) => {
    out.push(
      d1
        .prepare("INSERT INTO categories (id, space_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(catIds[preset.key], spaceId, preset[locale], i, now, now),
    );
  });

  // 予算は人ごと：5か月前から来月まで（3か月前だけ控えめにして、予算オーバーの月を1つ見せる）
  const month = yearMonthOf(today);
  for (const userId of [youId, partnerId]) {
    for (let i = -5; i <= 1; i++) {
      out.push(
        d1
          .prepare("INSERT INTO budgets (id, space_id, user_id, year_month, budget_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), spaceId, userId, addMonths(month, i), i === -3 ? 30000 : i === -2 ? 100000 : 90000, now, now),
      );
    }
  }

  // 支出：5か月前の1日から今日まで、2日に1回くらい（分析の推移が6か月そろうように）
  const r = rng(11);
  const start = `${addMonths(month, -5)}-01`;
  for (let d = start; d <= today; d = addDays(d, 1)) {
    if (r() < 0.45) continue;
    const item = EXPENSE_ITEMS[Math.floor(r() * EXPENSE_ITEMS.length)]!;
    const amount = Math.round((item.min + r() * (item.max - item.min)) / 10) * 10;
    // 3か月前の月はやや多め（予算オーバーの月が1つある見本にする）
    const boost = yearMonthOf(d) === addMonths(month, -3) ? 1.35 : 1;
    out.push(expense(d1, { spaceId, by: r() < 0.55 ? youId : partnerId, title: item.text[locale], amount: Math.round(amount * boost), catId: catIds[item.cat], date: d, now }));
  }

  // 予定（購入済みのものには支出を付ける）
  for (const p of PLANS) {
    const id = crypto.randomUUID();
    const date = p.dayOffset === null ? null : addDays(today, p.dayOffset);
    const by = p.byPartner ? partnerId : youId;
    const split = p.split ? { splitUserId: by === youId ? partnerId : youId, payerRatio: 50 } : { splitUserId: null, payerRatio: 100 };
    out.push(
      d1
        .prepare(
          `INSERT INTO purchase_plans (id, space_id, created_by, assignee_user_id, title, planned_amount, category_id, planned_date, memo, product_url, status, payer_user_id, split_user_id, payer_ratio, created_at, updated_at)
           VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, spaceId, by, p.text[locale], p.amount, catIds[p.cat], date, p.memo?.[locale] ?? null, p.status, by, split.splitUserId, split.payerRatio, now, now),
    );
    if (p.status === "purchased" && date) {
      out.push(expense(d1, { spaceId, by, title: p.text[locale], amount: p.paid ?? p.amount, catId: catIds[p.cat], date, now, planId: id, ...split }));
    }
  }
  return out;
}

function expense(
  d1: D1Database,
  e: { spaceId: string; by: string; title: string; amount: number; catId: string; date: IsoDate; now: string; planId?: string; splitUserId?: string | null; payerRatio?: number },
) {
  return d1
    .prepare(
      `INSERT INTO expenses (id, space_id, purchase_plan_id, recorded_by, title, actual_amount, category_id, spent_at, memo, payer_user_id, split_user_id, payer_ratio, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), e.spaceId, e.planId ?? null, e.by, e.title, e.amount, e.catId, e.date, e.by, e.splitUserId ?? null, e.payerRatio ?? 100, e.now, e.now);
}

/** はるさんの予定（見本のスペースのカテゴリの並びから、カテゴリを選ぶ） */
export const partnerVisitDate = (today: IsoDate) => addDays(today, PARTNER_VISIT_PLAN.dayOffset);

