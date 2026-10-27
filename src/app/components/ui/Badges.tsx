import type { MessageKey } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import type { PlanStatus } from "@shared/money/summary";
import { useT } from "../../i18n/I18nProvider";
import { Icon, type IconName } from "./Icon";

const STATUS: Record<PlanStatus, { label: MessageKey; icon: IconName; className: string }> = {
  planned: { label: "status.planned", icon: "cart", className: "bg-[#e8e7fb] text-[#2b2f6b] border-[#2b2f6b]/20" },
  purchased: { label: "status.purchased", icon: "check", className: "bg-[#d9f6f3] text-[#0b4a55] border-[#0b4a55]/20" },
  canceled: { label: "status.canceled", icon: "ban", className: "bg-[#eef0f3] text-[#4b5563] border-[#4b5563]/20" },
};

/** 予定のステータス。色だけでなくアイコンと文字で伝える（どのテーマの上でも読めるよう、地は不透明） */
export function StatusBadge({ status }: { status: PlanStatus }) {
  const { t } = useT();
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${s.className}`}>
      <Icon name={s.icon} size={14} />
      {t(s.label)}
    </span>
  );
}

/** カテゴリ。null は「未分類」 */
export function CategoryBadge({ name }: { name: string | null }) {
  const { t } = useT();
  return (
    <span className="inline-flex items-center rounded-full border border-current/25 px-2 py-0.5 text-xs">
      {name ?? t("badge.uncategorized")}
    </span>
  );
}

/** 予定から作られた支出の印 */
export function FromPlanBadge() {
  const { t } = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#2b2f6b]/20 bg-[#e8e7fb] px-2 py-0.5 text-xs font-semibold text-[#2b2f6b]">
      <Icon name="plans" size={14} />
      {t("badge.fromPlan")}
    </span>
  );
}

/** デモデータであることを画面上部に示す */
export function DemoDataBanner() {
  const { t } = useT();
  return (
    <div
      role="note"
      aria-label={t("common.demoAria")}
      className="bg-[#ffd18b] px-4 py-1 text-center text-[11px] font-semibold tracking-[0.12em] text-[#111827] uppercase"
    >
      {t("common.demo")}
    </div>
  );
}

/** 割り勘の印。自分が関わっていれば自分の分の金額も出す（例：割り勘 自分 ¥5,000） */
export function SplitBadge({ myShare }: { myShare: number | null }) {
  const { t } = useT();
  return (
    <span className="num inline-flex items-center rounded-full border border-current/30 px-2 py-0.5 text-[11px] font-semibold">
      {t("badge.split")}
      {myShare !== null && ` ${t("badge.myShare", { amount: formatYen(myShare) })}`}
    </span>
  );
}
