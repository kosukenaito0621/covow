/*
 * 割り勘（予定・支出を2人で分ける）。お金の計算はここだけで行い、サーバーも画面もこれを使う。
 * 割合は払う人の %（10〜100 の 10 きざみ。分けないときは 100）。
 */

export interface Split {
  payerUserId: string;
  /** null＝分けない */
  splitUserId: string | null;
  payerRatio: number;
}

/**
 * 金額を払う人と相手に分ける。1円の端数は割合の大きい人へ、同じなら払う人へ寄せる。
 * 2人の合計は必ず元の金額と一致する。
 */
export function splitAmounts(amount: number, payerRatio: number): { payer: number; other: number } {
  if (payerRatio >= 50) {
    const other = Math.floor((amount * (100 - payerRatio)) / 100);
    return { payer: amount - other, other };
  }
  const payer = Math.floor((amount * payerRatio) / 100);
  return { payer, other: amount - payer };
}

/** その人が払う人か分ける相手か */
export const involves = (split: Split, userId: string): boolean => split.payerUserId === userId || split.splitUserId === userId;

/** その人の分の金額（関わらなければ 0） */
export function userShare(amount: number, split: Split, userId: string): number {
  const { payer, other } = splitAmounts(amount, split.splitUserId === null ? 100 : split.payerRatio);
  if (split.payerUserId === userId) return payer;
  if (split.splitUserId === userId) return other;
  return 0;
}

/** 金額をその人の分に置き換えた一覧（関わらないものは外す）。今の集計の関数にそのまま渡せる */
export function forUser<T extends Split, K extends "plannedAmount" | "actualAmount">(
  items: readonly (T & Record<K, number>)[],
  userId: string,
  amountKey: K,
): (T & Record<K, number>)[] {
  return items.filter((x) => involves(x, userId)).map((x) => ({ ...x, [amountKey]: userShare(x[amountKey], x, userId) }));
}
