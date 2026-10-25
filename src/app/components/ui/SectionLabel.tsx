import type { ReactNode } from "react";

/** 画面の中の見出し（小さな大文字のラベル） */
export const LABEL = "text-[12px] leading-none font-semibold tracking-[0.08em] uppercase";

export function SectionLabel({ id, children, as: Tag = "h2" }: { id?: string; children: ReactNode; as?: "h2" | "h3" | "p" }) {
  return (
    <Tag id={id} className={LABEL}>
      {children}
    </Tag>
  );
}

/** 文字の色を少し薄くする。明るい面ではテーマの文字色のまま薄め（灰色にすると色味が浮くため） */
export const mutedText = (tone: "light" | "dark") => (tone === "light" ? "text-current/85" : "text-white/90");
