import { useT } from "../../i18n/I18nProvider";
import { Icon } from "../ui/Icon";

/**
 * 先月の同じ日までとの比較。矢印＋文字で示し、色で良し悪しを付けない。
 * ratio が null（先月 0 円）のときは「—」。
 */
export function DeltaBadge({ ratio }: { ratio: number | null }) {
  const { t } = useT();
  const base = "num inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full border border-current/35 px-2 text-[12px] font-semibold";
  if (ratio === null) {
    return (
      <span className={base}>
        <span aria-hidden="true">{t("delta.short")} —</span>
        <span className="sr-only">{t("delta.none")}</span>
      </span>
    );
  }
  const pct = Math.round(Math.abs(ratio) * 100);
  const dir = pct === 0 ? "same" : ratio > 0 ? "up" : "down";
  const spoken = dir === "same" ? t("delta.same") : t(dir === "up" ? "delta.up" : "delta.down", { percent: pct });
  return (
    <span className={base}>
      {dir === "up" && <Icon name="arrowUp" size={13} />}
      {dir === "down" && <Icon name="arrowDown" size={13} />}
      <span aria-hidden="true">{dir === "same" ? "±0%" : `${pct}%`}</span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
