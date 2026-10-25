import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DotAmount } from "../ui/DotAmount";

/** 2列のピルの中で、金額に使える幅 */
const HALF_ROOM = "((min(100vw, 480px) - 44px) / 2 - 52px)";

/**
 * ピル型のメトリクスカード（両端が半円の横長カプセル、透けるガラス）。
 * 色の意味はテーマが変わっても固定：p1＝今月の実支出、p2＝未購入の予定（p3＝使用率は UsedBar）。
 * 金額はすべての桁をドット文字で出し、正確な読み上げは ariaLabel で伝える。
 */
export function MetricPill({
  tone,
  label,
  amount,
  ariaLabel,
  foot,
  onClick,
}: {
  tone: "p1" | "p2";
  label: string;
  amount: number;
  ariaLabel: string;
  /** 下の行（増減バッジ・件数など） */
  foot?: ReactNode;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="text-[12px] leading-none font-semibold tracking-[0.08em] uppercase">{label}</span>
      <span aria-hidden="true">
        <DotAmount value={amount} room={HALF_ROOM} />
      </span>
      {foot && <span className="flex min-h-6 items-center gap-1.5 text-[12px] leading-none font-medium">{foot}</span>}
    </>
  );
  const className = `lg lg-${tone} flex h-[112px] w-full min-w-0 flex-col justify-between rounded-full px-[26px] py-[16px] text-left`;
  if (onClick) {
    return (
      <motion.button
        type="button"
        aria-label={ariaLabel}
        onClick={onClick}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className={className}
      >
        {body}
      </motion.button>
    );
  }
  return (
    <div role="group" aria-label={ariaLabel} className={className}>
      {body}
    </div>
  );
}
