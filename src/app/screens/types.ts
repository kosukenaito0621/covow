import type { IsoDate } from "@shared/date/jst";
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
}

export interface MemberView {
  id: string;
  name: string;
  isMe?: boolean;
}
