import { motion } from "motion/react";
import type { ReactNode } from "react";

/** 1画面に1枚だけのヒーローカード（透けるガラス。色はテーマの --hero-*） */
export function HeroGlassCard({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <motion.section
      aria-labelledby={labelledBy}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`lg lg-hero rounded-[32px] p-5 ${className ?? ""}`}
    >
      {children}
    </motion.section>
  );
}
