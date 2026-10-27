import { useState } from "react";
import type { IsoDate } from "@shared/date/jst";
import { type MessageKey } from "@shared/i18n";
import { formatNumber, formatYen, parseAmountInput } from "@shared/money/amount";
import { type Split, userShare } from "@shared/money/split";
import { LIMITS } from "@shared/schemas";
import type { Plan, PlanBody } from "../../api/data";
import { GlassSheet } from "../../components/glass/GlassSheet";
import { PrimaryButton } from "../../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../../components/ui/FormField";
import { AttentionNote } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { CategoryChoice, MemoInput } from "./fields";
import { PayerField } from "./PayerField";

/**
 * 購入予定の登録・編集のシート。
 * 下に「自分のいまの残額 → 登録後」を出し、予算を超えそうなら注意を添える（計算は previewRemaining＝shared/money。割り勘は自分の分で）。
 */
export function PlanFormSheet({
  open,
  onClose,
  plan,
  sample,
  categories,
  members,
  me,
  previewRemaining,
  onSubmit,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  /** 編集する予定（null なら新しく登録） */
  plan: Plan | null;
  /** 新しく登録するときの見本の値（伴走ガイドで使う） */
  sample?: { title: string; amount: number } | null;
  categories: readonly { id: string; name: string }[];
  /** 払う人・分ける相手の候補（1人だけなら欄を出さない） */
  members: readonly { id: string; name: string }[];
  /** ログイン中の人 */
  me: string;
  /** 自分の分の金額で、自分の残額の変化を出す */
  previewRemaining: (myAmount: number, date: IsoDate | null) => { before: number; after: number } | null;
  onSubmit: (body: PlanBody) => void;
  pending: boolean;
  error: MessageKey | null;
}) {
  const { t } = useT();
  // 入力の初期値は、編集する予定の値（新規なら空）。呼び出し側が開くたびに key を変えて作り直す
  const [title, setTitle] = useState(plan?.title ?? sample?.title ?? "");
  const [amount, setAmount] = useState(plan ? formatNumber(plan.plannedAmount) : sample ? formatNumber(sample.amount) : "");
  const [date, setDate] = useState(plan?.plannedDate ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(plan?.categoryId ?? null);
  const [split, setSplit] = useState<Split>(
    plan ? { payerUserId: plan.payerUserId, splitUserId: plan.splitUserId, payerRatio: plan.payerRatio } : { payerUserId: me, splitUserId: null, payerRatio: 100 },
  );
  const [memo, setMemo] = useState(plan?.memo ?? "");
  const [url, setUrl] = useState(plan?.productUrl ?? "");
  const [touched, setTouched] = useState(false);

  const parsed = parseAmountInput(amount);
  const titleError = touched && title.trim() === "" ? t("error.validation") : undefined;
  const amountError = touched && !parsed.ok ? t(`amount.${parsed.error}`) : undefined;
  const preview = parsed.ok ? previewRemaining(userShare(parsed.value, split, me), date || null) : null;

  const submit = () => {
    setTouched(true);
    if (title.trim() === "" || !parsed.ok) return;
    onSubmit({
      title: title.trim(),
      plannedAmount: parsed.value,
      plannedDate: date || null,
      categoryId,
      memo: memo.trim() || null,
      productUrl: url.trim() || null,
      assigneeUserId: plan?.assigneeUserId ?? null,
      ...split,
    });
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={plan ? t("plan.editTitle") : t("plan.add")}
      footer={
        <div className="flex flex-col gap-3">
          {preview && (
            <p className="num flex items-center justify-between gap-3 text-[14px]">
              <span className="text-white/90">{t("plan.thisMonthLeft")}</span>
              <span className="whitespace-nowrap">
                <span className="text-white/90">{formatYen(preview.before)}</span>
                <span className="ml-2 font-semibold">→ {formatYen(preview.after)}</span>
              </span>
            </p>
          )}
          {preview && preview.after < 0 && <AttentionNote tone="dark">{t("attention.overBy", { amount: formatYen(-preview.after) })}</AttentionNote>}
          {error && (
            <p role="alert" className="text-[14px] font-medium text-amber">
              {t(error)}
            </p>
          )}
          <PrimaryButton tone="dark" fullWidth loading={pending} onClick={submit} data-tour="plan-submit">
            {plan ? t("common.save") : t("plan.add")}
          </PrimaryButton>
        </div>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormField label={t("plan.item")} required error={titleError}>
          {(f) => <TextInput {...f} value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />}
        </FormField>
        <FormField label={t("plan.amount")} required error={amountError}>
          {(f) => <AmountInput {...f} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="12,800" />}
        </FormField>
        <FormField label={t("plan.date")} hint={t("plan.dateHint")}>
          {(f) => <TextInput {...f} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </FormField>
        <CategoryChoice value={categoryId} onChange={setCategoryId} categories={categories} />
        <PayerField members={members} me={me} amount={parsed.ok ? parsed.value : null} value={split} onChange={setSplit} />
        <FormField label={t("plan.memo")}>{(f) => <MemoInput id={f.id} value={memo} onChange={setMemo} maxLength={LIMITS.memo} />}</FormField>
        <FormField label={t("plan.link")}>
          {(f) => <TextInput {...f} type="url" inputMode="url" value={url} maxLength={LIMITS.url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />}
        </FormField>
        {/* Enter で送信できるように（見えない・読み上げない送信ボタン） */}
        <button type="submit" hidden />
      </form>
    </GlassSheet>
  );
}
