import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { type IsoDate, yearMonthOf } from "@shared/date/jst";
import { formatShortDate, type MessageKey } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import type { PlanStatus } from "@shared/money/summary";
import { AddPill } from "../components/glass/AddPill";
import { GlassCard } from "../components/glass/GlassCard";
import { TabChips } from "../components/glass/TabChips";
import { CategoryBadge, StatusBadge } from "../components/ui/Badges";
import { Icon } from "../components/ui/Icon";
import { SearchField } from "../components/ui/SearchField";
import { mutedText, SectionLabel } from "../components/ui/SectionLabel";
import { EmptyState } from "../components/ui/States";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import type { PlanView } from "./types";

type Filter = "all" | PlanStatus;
type Group = "overdue" | "thisMonth" | "later" | "noDate" | "done";

const GROUP_LABEL: Record<Group, MessageKey> = {
  overdue: "plans.overdue",
  thisMonth: "plans.thisMonth",
  later: "plans.later",
  noDate: "plans.noDate",
  done: "plans.done",
};

const groupOf = (p: PlanView, today: IsoDate): Group => {
  if (p.status !== "planned") return "done";
  if (!p.plannedDate) return "noDate";
  if (p.plannedDate < today) return "overdue";
  return yearMonthOf(p.plannedDate) === yearMonthOf(today) ? "thisMonth" : "later";
};

/** 予定の一覧。上で状態を絞り込み、検索欄で商品名・メモを探す。未購入は日付ごとにまとめる */
export function PlansScreen({
  plans,
  today,
  onOpen,
  onAdd,
}: {
  plans: readonly PlanView[];
  today: IsoDate;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const { t } = useT();
  const { theme } = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const count = (s: Filter) => (s === "all" ? plans.length : plans.filter((p) => p.status === s).length);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = plans
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || (p.memo ?? "").toLowerCase().includes(q));
    const order: Group[] = ["overdue", "thisMonth", "later", "noDate", "done"];
    return order
      .map((g) => ({
        g,
        items: shown
          .filter((p) => groupOf(p, today) === g)
          .sort((a, b) => (a.plannedDate ?? "9999").localeCompare(b.plannedDate ?? "9999")),
      }))
      .filter((x) => x.items.length > 0);
  }, [plans, filter, query, today]);

  const filters: Filter[] = ["all", "planned", "purchased", "canceled"];
  const firstPlannedId = groups.flatMap((x) => x.items).find((p) => p.status === "planned")?.id;
  const filterLabel = (f: Filter) => (f === "all" ? t("home.all") : t(`status.${f}`));

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-[28px] leading-none font-bold tracking-tight">{t("plans.title")}</h1>
      </header>

      <SearchField
        label={t("plans.search")}
        placeholder={t("plans.searchPlaceholder")}
        tone={theme.tone.page}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <TabChips
        label={t("plans.filter")}
        value={filter}
        onChange={setFilter}
        tone={theme.tone.page}
        idPrefix="plans"
        options={filters.map((f) => ({ value: f, label: `${filterLabel(f)} ${count(f)}` }))}
      />

      <div id="plans-panel" role="tabpanel" aria-labelledby={`plans-tab-${filter}`} className="flex flex-col gap-6">
        {plans.length === 0 ? (
          <GlassCard>
            <EmptyState
              tone={theme.tone.card}
              icon="plans"
              title={t("plans.empty")}
              body={t("plans.emptyBody")}
              action={{ label: t("plan.add"), onClick: onAdd }}
            />
          </GlassCard>
        ) : groups.length === 0 ? (
          <GlassCard>
            <EmptyState tone={theme.tone.card} icon="search" title={t("plans.noMatch")} body={t("plans.noMatchBody")} />
          </GlassCard>
        ) : (
          groups.map(({ g, items }) => (
            <section key={g} aria-labelledby={`group-${g}`} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                {g === "overdue" && <Icon name="attention" size={16} />}
                <SectionLabel id={`group-${g}`}>{t(GROUP_LABEL[g])}</SectionLabel>
                <span className="num text-[12px] font-semibold opacity-85">{items.length}</span>
              </div>
              {items.map((p, i) => (
                <PlanRow key={p.id} plan={p} index={i} overdue={g === "overdue"} onOpen={() => onOpen(p.id)} tourTarget={p.id === firstPlannedId} />
              ))}
            </section>
          ))
        )}
      </div>

      <div
        data-fixed-overlay
        className="fixed right-[max(16px,calc((100vw-480px)/2+16px))] bottom-[calc(env(safe-area-inset-bottom)+100px+var(--coach-h,0px))] z-30"
      >
        <AddPill onClick={onAdd} />
      </div>
    </>
  );
}

function PlanRow({
  plan: p,
  index,
  overdue,
  onOpen,
  tourTarget,
}: {
  plan: PlanView;
  index: number;
  overdue: boolean;
  onOpen: () => void;
  /** 伴走ガイドで光らせる行（未購入の先頭） */
  tourTarget?: boolean;
}) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const muted = mutedText(theme.tone.card);
  const date = p.purchase?.date ?? p.plannedDate;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.03 }}
    >
      <GlassCard>
        <button
          type="button"
          onClick={onOpen}
          data-tour={tourTarget ? "plan-row" : undefined}
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <p className={`line-clamp-2 text-[15px] leading-snug font-semibold ${p.status === "canceled" ? "line-through decoration-1" : ""}`}>
              {p.title}
            </p>
            <p className={`num mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] ${muted}`}>
              <span>{p.createdBy}</span>
              {date && (
                <span className={overdue ? "font-semibold" : ""}>
                  ・ {formatShortDate(date, locale)}
                </span>
              )}
              <CategoryBadge name={p.category} />
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span className="num text-[15px] font-semibold">{formatYen(p.purchase?.amount ?? p.plannedAmount)}</span>
            {p.status === "planned" ? (
              <span className="sr-only">{t("status.planned")}</span>
            ) : (
              <StatusBadge status={p.status} />
            )}
          </div>
          <Icon name="chevronRight" size={18} className="shrink-0 opacity-70" />
        </button>
      </GlassCard>
    </motion.div>
  );
}
