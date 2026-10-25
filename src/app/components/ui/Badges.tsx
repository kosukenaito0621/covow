import type { PlanStatus } from "@shared/money/summary";
import { Icon, type IconName } from "./Icon";

const STATUS: Record<PlanStatus, { label: string; icon: IconName; className: string }> = {
  planned: { label: "未購入", icon: "cart", className: "bg-lavender/30 text-[#2b2f6b] border-[#2b2f6b]/20" },
  purchased: { label: "購入済み", icon: "check", className: "bg-cyan/30 text-[#0b4a55] border-[#0b4a55]/20" },
  canceled: { label: "キャンセル", icon: "ban", className: "bg-ink/6 text-ink-muted border-ink/15" },
};

/** 予定のステータス。色だけでなくアイコンと文字で伝える */
export function StatusBadge({ status }: { status: PlanStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${s.className}`}>
      <Icon name={s.icon} size={14} />
      {s.label}
    </span>
  );
}

/** カテゴリ。null は「未分類」 */
export function CategoryBadge({ name }: { name: string | null }) {
  return (
    <span className="inline-flex items-center rounded-full border border-ink/15 bg-white/60 px-2 py-0.5 text-xs text-ink-muted">
      {name ?? "未分類"}
    </span>
  );
}

/** 予定から作られた支出の印 */
export function FromPlanBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#2b2f6b]/20 bg-lavender/25 px-2 py-0.5 text-xs font-semibold text-[#2b2f6b]">
      <Icon name="plans" size={14} />
      予定から
    </span>
  );
}

/** デモデータであることを画面上部に示す */
export function DemoDataBanner() {
  return (
    <div
      role="note"
      aria-label="デモデータを表示しています"
      className="bg-amber px-4 py-1 text-center text-[11px] font-semibold tracking-[0.12em] text-[#111827] uppercase"
    >
      Demo
    </div>
  );
}
