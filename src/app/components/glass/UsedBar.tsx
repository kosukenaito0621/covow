import { formatYen } from "@shared/money/amount";
import { useT } from "../../i18n/I18nProvider";
import { Icon } from "../ui/Icon";

/**
 * 予算使用率。靄のかかった透明なガラスに、使った割合までテーマの色（p3）が満ちていく。
 * 予算を超えたら、いっぱいに満ちて縁がアンバーに光り、⚠ も出す（色だけで伝えない）。
 * 計算は呼び出し側（shared/money）で行い、ここでは表示だけをする。
 */
export function UsedBar({ rate, used, budget }: { rate: number; used: number; budget: number }) {
  const { t, locale } = useT();
  const sep = locale === "ja" ? "、" : ", ";
  const pct = Math.round(rate * 100);
  const over = rate > 1;
  return (
    <div
      role="meter"
      aria-label={t("metric.budgetUsed")}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(pct, 100)}
      aria-valuetext={`${t("metric.usedValue", { percent: pct, used: formatYen(used), budget: formatYen(budget) })}${over ? `${sep}${t("metric.overBudget")}` : ""}`}
      data-full={rate >= 1}
      data-over={over}
      className="lg lg-card used flex h-[84px] items-center justify-between gap-3 rounded-full px-8"
      style={{ ["--used" as string]: `${Math.min(Math.max(rate, 0), 1) * 100}%` }}
    >
      <span className="used-fill" aria-hidden="true" />
      <span className="flex flex-col gap-1.5" aria-hidden="true">
        <span className="text-[12px] leading-none font-semibold tracking-[0.08em] uppercase">{t("metric.used")}</span>
        <span className="num text-[12px] leading-none font-semibold">
          {formatYen(used)} / {formatYen(budget)}
        </span>
      </span>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        {over && <Icon name="attention" size={20} />}
        <span className="dot-number text-[30px]">
          {pct}
          <span className="font-ui text-[16px] font-bold">%</span>
        </span>
      </span>
    </div>
  );
}
