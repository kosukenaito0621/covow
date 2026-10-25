import { Icon } from "../ui/Icon";

/**
 * 先月の同じ日までとの比較。矢印＋文字で示し、色で良し悪しを付けない。
 * ratio が null（先月 0 円）のときは「先月の記録なし」。
 */
export function DeltaBadge({ ratio, tone = "light" }: { ratio: number | null; tone?: "light" | "dark" }) {
  const line = tone === "dark" ? "border-white/45" : "border-ink/35";
  if (ratio === null) {
    return (
      <span className={`inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[12px] font-medium ${line}`}>
        先月比 —<span className="sr-only">先月の同じ日までの記録はありません</span>
      </span>
    );
  }
  const pct = Math.round(Math.abs(ratio) * 100);
  const dir = pct === 0 ? "same" : ratio > 0 ? "up" : "down";
  const spoken =
    dir === "same" ? "先月の同じ日までと同じくらい" : `先月の同じ日までより${pct}%${dir === "up" ? "多い" : "少ない"}`;
  return (
    <span
      className={`num inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full border px-2 text-[12px] font-semibold ${line}`}
    >
      {dir === "up" && <Icon name="arrowUp" size={13} />}
      {dir === "down" && <Icon name="arrowDown" size={13} />}
      <span aria-hidden="true">{dir === "same" ? "±0%" : `${pct}%`}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
