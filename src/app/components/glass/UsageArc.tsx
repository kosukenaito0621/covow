import { motion } from "motion/react";
import { Icon } from "../ui/Icon";

/** 予算使用率の小さな弧のゲージ。100%を超えたら弧はいっぱいにして、アンバーの線にする */
export function UsageArc({ rate, size = 34 }: { rate: number | null; size?: number }) {
  const r = 16;
  const len = Math.PI * r; // 半円の長さ
  const clamped = rate === null ? 0 : Math.min(Math.max(rate, 0), 1);
  const over = rate !== null && rate > 1;
  return (
    <span className="inline-flex shrink-0 items-center gap-1">
    <svg width={size} height={size * 0.62} viewBox="0 0 40 24" aria-hidden="true" className="shrink-0">
      <path d="M4 22a16 16 0 0 1 32 0" fill="none" stroke="currentColor" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
      {rate !== null && (
        <motion.path
          d="M4 22a16 16 0 0 1 32 0"
          fill="none"
          stroke={over ? "var(--glow-amber)" : "currentColor"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={len}
          initial={{ strokeDashoffset: len }}
          animate={{ strokeDashoffset: len * (1 - clamped) }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
    </svg>
      {/* 超過は色だけでなくアイコンでも示す（読み上げは呼び出し側の ariaLabel で伝える） */}
      {over && <Icon name="attention" size={16} />}
    </span>
  );
}
