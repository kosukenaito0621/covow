import type { IsoDate } from "@shared/date/jst";
import type { Split } from "@shared/money/split";
import type { PlanStatus } from "@shared/money/summary";

/** 画面に出す予定の1件（サーバーから受け取った値をそのまま表示するための形） */
export interface PlanView {
  id: string;
  title: string;
  plannedAmount: number;
  plannedDate: IsoDate | null;
  status: PlanStatus;
  /** 追加した人の表示名 */
  createdBy: string;
  category: string | null;
  memo?: string;
  url?: string;
  /** 購入済みのとき：実際の金額と買った日 */
  purchase?: { amount: number; date: IsoDate };
  /** 割り勘（払う人・相手・割合と、それぞれの名前）。見本の画面では省略できる */
  split?: Split & { payerName: string; splitName: string | null };
}

export interface MemberView {
  id: string;
  name: string;
  isMe?: boolean;
}

/** サーバーの予定（api/data の Plan）を、画面の部品に渡す形にする */
export const toPlanView = (p: {
  id: string;
  title: string;
  plannedAmount: number;
  plannedDate: IsoDate | null;
  status: PlanStatus;
  createdByName: string;
  categoryName: string | null;
  memo: string | null;
  productUrl: string | null;
  expense: { actualAmount: number; spentAt: IsoDate } | null;
  payerUserId: string;
  payerName: string;
  splitUserId: string | null;
  splitName: string | null;
  payerRatio: number;
}): PlanView => ({
  id: p.id,
  title: p.title,
  plannedAmount: p.plannedAmount,
  plannedDate: p.plannedDate,
  status: p.status,
  createdBy: p.createdByName,
  category: p.categoryName,
  memo: p.memo ?? undefined,
  url: p.productUrl ?? undefined,
  purchase: p.expense ? { amount: p.expense.actualAmount, date: p.expense.spentAt } : undefined,
  split: { payerUserId: p.payerUserId, payerName: p.payerName, splitUserId: p.splitUserId, splitName: p.splitName, payerRatio: p.payerRatio },
});
