import { motion } from "motion/react";
import { formatYen } from "@shared/money/amount";

/** カテゴリ別の実支出（横棒）。金額と%を文字でも表示する */
export function CategoryBars({
  rows,
}: {
  rows: readonly { key: string; name: string; amount: number; ratio: number }[];
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[14px]">
            <span className="font-semibold">{r.name}</span>
            <span className="num shrink-0">
              {formatYen(r.amount)}
              <span className="ml-2 text-white/78">{Math.round(r.ratio * 100)}%</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/12" aria-hidden="true">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan to-lavender"
              initial={{ width: 0 }}
              animate={{ width: `${(r.amount / max) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
