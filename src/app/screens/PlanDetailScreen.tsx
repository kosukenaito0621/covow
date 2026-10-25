import { type ReactNode, useState } from "react";
import type { IsoDate } from "@shared/date/jst";
import { formatShortDate, type MessageKey } from "@shared/i18n";
import { formatNumber, formatYen, parseAmountInput } from "@shared/money/amount";
import { ConfirmDialog } from "../components/glass/ConfirmDialog";
import { GlassCard } from "../components/glass/GlassCard";
import { GlassSheet } from "../components/glass/GlassSheet";
import { HeroGlassCard } from "../components/glass/HeroGlassCard";
import { CategoryBadge, StatusBadge } from "../components/ui/Badges";
import { CircleIconButton, PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../components/ui/FormField";
import { HeroAmount } from "../components/ui/HeroAmount";
import { Icon } from "../components/ui/Icon";
import { mutedText } from "../components/ui/SectionLabel";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import type { PlanView } from "./types";

/**
 * 予定の詳細。未購入なら「買った」で実際の金額と日付を記録する（シートの下に残額の変化を出す）。
 * 残額の計算は shared/money に任せるため、previewRemaining として呼び出し側から受け取る。
 */
export interface PlanDetailActions {
  onPurchase?: (amount: number, date: IsoDate) => Promise<boolean>;
  onUnpurchase?: () => void;
  onCancel?: () => void;
  onRestore?: () => void;
  onDelete?: () => Promise<boolean>;
  onEdit?: () => void;
  pending?: boolean;
  /** 直前の操作の失敗（言語に合わせた文の鍵） */
  error?: MessageKey | null;
}

export function PlanDetailScreen({
  plan: p,
  today,
  previewRemaining,
  onBack,
  actions = {},
}: {
  plan: PlanView;
  today: IsoDate;
  previewRemaining: (amount: number, date: IsoDate) => { before: number; after: number } | null;
  onBack: () => void;
  /** 操作。どれも成功したら true を返す（シートや確認を閉じる） */
  actions?: PlanDetailActions;
}) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const heroMuted = mutedText(theme.tone.hero);
  const cardMuted = mutedText(theme.tone.card);
  const [sheet, setSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [amountText, setAmountText] = useState(formatNumber(p.plannedAmount));
  const [date, setDate] = useState<IsoDate>(today);
  const parsed = parseAmountInput(amountText);
  const preview = parsed.ok ? previewRemaining(parsed.value, date) : null;
  const diff = p.purchase ? p.purchase.amount - p.plannedAmount : 0;

  const rows: { label: string; value: ReactNode }[] = [
    { label: t("plan.date"), value: p.plannedDate ? formatShortDate(p.plannedDate, locale) : t("plans.noDate") },
    { label: t("plan.category"), value: <CategoryBadge name={p.category} /> },
    { label: t("plan.addedBy"), value: p.createdBy },
  ];
  if (p.url) {
    rows.push({
      label: t("plan.link"),
      value: (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1 font-semibold underline underline-offset-4"
        >
          {new URL(p.url).hostname}
          <Icon name="externalLink" size={16} />
        </a>
      ),
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <CircleIconButton tone={theme.tone.page} icon="arrowLeft" label={t("common.back")} onClick={onBack} />
        <CircleIconButton tone={theme.tone.page} icon="edit" label={t("plan.edit")} onClick={actions.onEdit} />
      </div>

      <HeroGlassCard labelledBy="plan-title">
        <StatusBadge status={p.status} />
        <h1 id="plan-title" className="mt-3 text-[22px] leading-snug font-bold">
          {p.title}
        </h1>
        <HeroAmount value={p.purchase?.amount ?? p.plannedAmount} />
        {p.purchase && (
          <div className={`num mt-1 flex flex-col gap-1 text-[13px] ${heroMuted}`}>
            <span>
              {t("plan.amount")} {formatYen(p.plannedAmount)} ・ {t("plan.boughtOn", { date: formatShortDate(p.purchase.date, locale) })}
            </span>
            <span className="font-semibold">
              {diff === 0
                ? t("plan.same")
                : diff < 0
                  ? t("plan.under", { amount: formatYen(-diff) })
                  : t("plan.over", { amount: formatYen(diff) })}
            </span>
          </div>
        )}
      </HeroGlassCard>

      <GlassCard className="px-4 py-1">
        <dl className="divide-y divide-current/10">
          {rows.map((r) => (
            <div key={r.label} className="flex min-h-12 items-center justify-between gap-4 py-2">
              <dt className={`text-[13px] ${cardMuted}`}>{r.label}</dt>
              <dd className="num text-right text-[15px] font-medium">{r.value}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>

      {p.memo && (
        <GlassCard className="px-4 py-3">
          <p className={`text-[13px] ${cardMuted}`}>{t("plan.memo")}</p>
          <p className="mt-1 text-[15px] leading-relaxed whitespace-pre-wrap">{p.memo}</p>
        </GlassCard>
      )}

      <div className="flex flex-col gap-3">
        {actions.error && !sheet && (
          <p role="alert" className="flex items-start gap-2 text-[14px] font-medium">
            <Icon name="attention" size={18} className="mt-px shrink-0" />
            {t(actions.error)}
          </p>
        )}
        {p.status === "planned" && (
          <PrimaryButton tone={theme.tone.page} icon="check" fullWidth onClick={() => setSheet(true)}>
            {t("plan.markBought")}
          </PrimaryButton>
        )}
        <div className="flex gap-3">
          {p.status === "planned" ? (
            <SecondaryButton tone={theme.tone.page} icon="ban" className="flex-1" disabled={actions.pending} onClick={actions.onCancel}>
              {t("plan.cancel")}
            </SecondaryButton>
          ) : (
            <SecondaryButton
              tone={theme.tone.page}
              icon="undo"
              className="flex-1"
              disabled={actions.pending}
              onClick={p.status === "purchased" ? actions.onUnpurchase : actions.onRestore}
            >
              {t("plan.restore")}
            </SecondaryButton>
          )}
          <SecondaryButton tone={theme.tone.page} icon="trash" className="flex-1" onClick={() => setConfirm(true)}>
            {t("plan.delete")}
          </SecondaryButton>
        </div>
      </div>

      <GlassSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("plan.markBought")}
        footer={
          <div className="flex flex-col gap-3">
            {preview && (
              <p className="num flex items-center justify-between gap-3 text-[14px]">
                <span className="text-white/90">{t("plan.afterThis")}</span>
                <span className="whitespace-nowrap">
                  <span className="text-white/90">{formatYen(preview.before)}</span>
                  <span className="ml-2 font-semibold">→ {formatYen(preview.after)}</span>
                </span>
              </p>
            )}
            {actions.error && (
              <p role="alert" className="text-[14px] font-medium text-amber">
                {t(actions.error)}
              </p>
            )}
            <PrimaryButton
              tone="dark"
              icon="check"
              fullWidth
              disabled={!parsed.ok}
              loading={actions.pending}
              onClick={async () => {
                if (!parsed.ok) return;
                if (!actions.onPurchase || (await actions.onPurchase(parsed.value, date))) setSheet(false);
              }}
            >
              {t("plan.markBought")}
            </PrimaryButton>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={t("plan.actualAmount")} required error={parsed.ok ? undefined : t(`amount.${parsed.error}`)}>
            {(f) => <AmountInput {...f} value={amountText} onChange={(e) => setAmountText(e.target.value)} />}
          </FormField>
          <FormField label={t("plan.boughtDate")} required>
            {(f) => <TextInput {...f} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />}
          </FormField>
        </div>
      </GlassSheet>

      <ConfirmDialog
        open={confirm}
        title={t("plan.deleteConfirm")}
        body={p.purchase ? t("plan.deleteBody") : undefined}
        confirmLabel={t("plan.delete")}
        busy={actions.pending}
        onConfirm={async () => {
          if (!actions.onDelete || (await actions.onDelete())) setConfirm(false);
        }}
        onCancel={() => setConfirm(false)}
      />
    </>
  );
}
