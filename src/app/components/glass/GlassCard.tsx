import type { ComponentProps } from "react";

/** 一覧などに使う透けるガラスのカード（色はテーマの --card-*） */
export function GlassCard({ className, ...rest }: ComponentProps<"div">) {
  return <div className={`lg lg-card rounded-[24px] ${className ?? ""}`} {...rest} />;
}
