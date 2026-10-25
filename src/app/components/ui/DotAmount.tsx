import { formatNumber } from "@shared/money/amount";

/**
 * ピルの金額。すべての桁を出す（¥ は通常の書体、数字はドット文字）。
 * 桁が増えたら、与えられた幅（room：CSS の長さの式）に収まるよう文字を小さくする。
 */
export function DotAmount({ value, max = 24, room }: { value: number; max?: number; room: string }) {
  const digits = formatNumber(value);
  const size = `min(${max}px, calc(${room} / ${(digits.length * 0.66 + 0.7).toFixed(2)}))`;
  return (
    <span className="flex items-baseline gap-0.5 whitespace-nowrap" style={{ fontSize: size }}>
      <span className="text-[0.62em] font-bold">¥</span>
      <span className="dot-number">{digits}</span>
    </span>
  );
}
