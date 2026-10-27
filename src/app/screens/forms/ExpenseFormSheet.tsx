import { useState } from "react";
import type { IsoDate } from "@shared/date/jst";
import type { MessageKey } from "@shared/i18n";
import { formatNumber, parseAmountInput } from "@shared/money/amount";
import type { Split } from "@shared/money/split";
import { LIMITS } from "@shared/schemas";
import type { Expense, ExpenseBody } from "../../api/data";
import { GlassSheet } from "../../components/glass/GlassSheet";
import { FromPlanBadge } from "../../components/ui/Badges";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";
import { CategoryChoice, MemoInput } from "./fields";
import { PayerField } from "./PayerField";

/**
 * 支出の記録・編集のシート。
 * 予定から作られた支出は、金額・日付などは直せるが、ここからは消せない（予定の詳細で「予定に戻す」）。
 */
export function ExpenseFormSheet({
  open,
  onClose,
  expense,
  sample,
  today,
  categories,
  members,
  me,
  onSubmit,
  onDelete,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  expense: Expense | null;
  /** 新しく記録するときの見本の値（伴走ガイドで使う） */
  sample?: { title: string; amount: number } | null;
  today: IsoDate;
  categories: readonly { id: string; name: string }[];
  /** 払う人・分ける相手の候補（1人だけなら欄を出さない） */
  members: readonly { id: string; name: string }[];
  me: string;
  onSubmit: (body: ExpenseBody) => void;
  onDelete?: () => void;
  pending: boolean;
  error: MessageKey | null;
}) {
  const { t } = useT();
  // 入力の初期値は、編集する支出の値（新規なら空・今日）。呼び出し側が開くたびに key を変えて作り直す
  const [title, setTitle] = useState(expense?.title ?? sample?.title ?? "");
  const [amount, setAmount] = useState(expense ? formatNumber(expense.actualAmount) : sample ? formatNumber(sample.amount) : "");
  const [date, setDate] = useState(expense?.spentAt ?? today);
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null);
  const [memo, setMemo] = useState(expense?.memo ?? "");
  const [split, setSplit] = useState<Split>(
    expense
      ? { payerUserId: expense.payerUserId, splitUserId: expense.splitUserId, payerRatio: expense.payerRatio }
      : { payerUserId: me, splitUserId: null, payerRatio: 100 },
  );
  const [touched, setTouched] = useState(false);

  const parsed = parseAmountInput(amount);
  const fromPlan = !!expense?.purchasePlanId;
  const submit = () => {
    setTouched(true);
    if (title.trim() === "" || !parsed.ok || !date) return;
    onSubmit({ title: title.trim(), actualAmount: parsed.value, spentAt: date, categoryId, memo: memo.trim() || null, ...split });
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={expense ? t("expense.edit") : t("expense.add")}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <p role="alert" className="text-[14px] font-medium text-amber">
              {t(error)}
            </p>
          )}
          <PrimaryButton tone="dark" fullWidth loading={pending} onClick={submit} data-tour="expense-submit">
            {expense ? t("common.save") : t("expense.add")}
          </PrimaryButton>
          {expense && !fromPlan && onDelete && (
            <SecondaryButton tone="dark" icon="trash" fullWidth onClick={onDelete}>
              {t("plan.delete")}
            </SecondaryButton>
          )}
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
        {fromPlan && (
          <div className="flex flex-col items-start gap-2">
            <FromPlanBadge />
            <p className="text-[13px] text-white/90">{t("expense.fromPlanNote")}</p>
          </div>
        )}
        <FormField label={t("expense.item")} required error={touched && title.trim() === "" ? t("error.validation") : undefined}>
          {(f) => <TextInput {...f} value={title} maxLength={LIMITS.title} onChange={(e) => setTitle(e.target.value)} autoComplete="off" />}
        </FormField>
        <FormField label={t("expense.amount")} required error={touched && !parsed.ok ? t(`amount.${parsed.error}`) : undefined}>
          {(f) => <AmountInput {...f} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1,280" />}
        </FormField>
        <FormField label={t("expense.date")} required>
          {(f) => <TextInput {...f} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </FormField>
        <CategoryChoice value={categoryId} onChange={setCategoryId} categories={categories} />
        <PayerField members={members} me={me} amount={parsed.ok ? parsed.value : null} value={split} onChange={setSplit} />
        <FormField label={t("plan.memo")}>{(f) => <MemoInput id={f.id} value={memo} onChange={setMemo} maxLength={LIMITS.memo} />}</FormField>
        {/* Enter で送信できるように（見えない・読み上げない送信ボタン） */}
        <button type="submit" hidden />
      </form>
    </GlassSheet>
  );
}
