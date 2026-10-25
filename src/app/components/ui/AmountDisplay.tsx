import { animate, useReducedMotion } from "motion/react";
import { type CSSProperties, useEffect, useRef } from "react";
import { formatYen } from "@shared/money/amount";

/**
 * 金額の表示。値が変わると数え上げる（150〜400ms 程度）。
 * 読み上げは最終値だけ（数え上げ中の数字は aria-hidden）。
 */
export function AmountDisplay({
  value,
  className,
  style,
  countUp = true,
}: {
  value: number;
  className?: string;
  style?: CSSProperties;
  countUp?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = prev.current;
    prev.current = value;
    if (!countUp || reduce || from === value) {
      el.textContent = formatYen(value);
      return;
    }
    const controls = animate(from, value, {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatYen(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, countUp, reduce]);

  return (
    <span className={`num ${className ?? ""}`} style={style}>
      <span ref={ref} aria-hidden="true">
        {formatYen(value)}
      </span>
      <span className="sr-only">{formatYen(value)}</span>
    </span>
  );
}
