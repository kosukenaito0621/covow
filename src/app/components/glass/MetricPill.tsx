import { motion } from "motion/react";
import type { ReactNode } from "react";

export type PillTheme = "aurora" | "indigo" | "ember";

/** 「12.8万」「58%」を数字と単位に分ける（Doto に「万」の字形がないため、単位は通常の書体で小さく出す） */
const splitUnit = (value: string): [string, string] => {
  const m = /^(.*?)([万%件]?)$/.exec(value);
  return [m?.[1] ?? value, m?.[2] ?? ""];
};

/** Doto の小数点は幅が広く「6 3」に見えるので、小数点だけ通常の書体で詰めて出す */
function DotDigits({ text }: { text: string }) {
  const [int, dec] = text.split(".");
  return (
    <span className="dot-number text-[26px]">
      {int}
      {dec !== undefined && (
        <>
          <span className="font-ui text-[22px] font-bold">.</span>
          {dec}
        </>
      )}
    </span>
  );
}

/**
 * ピル型のメトリクスカード（両端が完全な半円の横長カプセル）。色の意味は固定：
 * ember＝今月の実支出、indigo＝未購入の予定、aurora＝予算使用率。
 * 数字はドット文字で短く表示し、正確な値は ariaLabel で伝える。
 */
export function MetricPill({
  theme,
  label,
  value,
  ariaLabel,
  sub,
  aside,
  onClick,
}: {
  theme: PillTheme;
  label: string;
  /** 短い表示（例：12.8万） */
  value: string;
  /** 正確な値を含む読み上げ用の文（例：今月の実支出 12万8,400円） */
  ariaLabel: string;
  /** 下の行の短い補足（例：3件） */
  sub?: ReactNode;
  /** 下の行の先頭に置く小さな要素（増減バッジ・ゲージ） */
  aside?: ReactNode;
  onClick?: () => void;
}) {
  const [num, unit] = splitUnit(value);
  const body = (
    <>
      <span className="block truncate text-[13px] leading-none font-semibold">{label}</span>
      <span className="relative block" aria-hidden="true">
        <span className="flex items-baseline gap-0.5 whitespace-nowrap">
          <DotDigits text={num} />
          {unit && <span className="text-[15px] leading-none font-bold">{unit}</span>}
        </span>
        <span className="dot-reflection-clip">
          <span className="dot-number dot-reflection block text-[26px]">{num}</span>
        </span>
      </span>
      {(sub || aside) && (
        <span className="flex min-h-6 items-center gap-1.5 text-[12px] leading-none font-medium whitespace-nowrap">
          {aside}
          {sub && <span className="truncate">{sub}</span>}
        </span>
      )}
    </>
  );
  const className = `metric-pill pill-${theme} has-grain flex h-[112px] w-full min-w-0 flex-col justify-between px-7 py-[15px] text-left`;
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
