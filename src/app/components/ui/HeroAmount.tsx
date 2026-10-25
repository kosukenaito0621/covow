import { formatYen } from "@shared/money/amount";
import { AmountDisplay } from "./AmountDisplay";

/**
 * ヒーローカードの最重要の金額（残額）。読みやすさを優先してドット文字は使わない。
 * 桁数が増えても1行に収まるよう、文字数と画面幅から文字の大きさを決める（最大 44px）。
 */
export function HeroAmount({ value }: { value: number }) {
  const chars = formatYen(value).length;
  // カードの中の幅 ≒ min(100vw, 480px) − 余白 72px。Inter の数字は 1em あたり約 0.62 文字幅
  const size = `min(44px, calc((min(100vw, 480px) - 72px) / ${(chars * 0.62).toFixed(2)}))`;
  return (
    <AmountDisplay value={value} className="block leading-tight font-semibold tracking-tight whitespace-nowrap" style={{ fontSize: size }} />
  );
}
