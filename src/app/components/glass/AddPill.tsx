import { motion } from "motion/react";
import { Icon } from "../ui/Icon";

/** 主要操作の白い不透明のピル（ガラスにしない） */
export function AddPill({
  label = "購入予定を追加",
  onClick,
  compact = false,
}: {
  label?: string;
  onClick: () => void;
  /** 一覧画面の右下などに置く小さい版 */
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className={
        compact
          ? "solid-pill inline-flex min-h-14 items-center gap-2 px-5 text-[15px] font-semibold"
          : "solid-pill flex h-[112px] w-full min-w-0 flex-col items-center justify-center gap-2 px-4 text-center"
      }
    >
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-ink text-white ${compact ? "size-8" : "size-10"}`}
      >
        <Icon name="plus" size={compact ? 18 : 22} />
      </span>
      <span className={compact ? "" : "text-[14px] leading-tight font-semibold"}>{label}</span>
    </motion.button>
  );
}
