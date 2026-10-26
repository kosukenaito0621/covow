import type { ReactNode } from "react";

/**
 * 1画面に1枚だけのヒーローカード（透けるガラス。色はテーマの --hero-*）。
 * 面そのものは動かさない（iPhone ではガラスの面の動きが重くカクつくため。中身の浮かび上がりは .reveal に任せる）。
 */
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
    <section aria-labelledby={labelledBy} className={`lg lg-hero rounded-[32px] p-5 ${className ?? ""}`}>
      {children}
    </section>
  );
}
