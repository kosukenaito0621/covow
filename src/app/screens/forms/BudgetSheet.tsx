import { useState } from "react";
import type { YearMonth } from "@shared/date/jst";
import { formatMonth } from "@shared/i18n";
import { formatNumber, parseAmountInput } from "@shared/money/amount";
import { errorKey } from "../../api/space";
import { usePutBudget } from "../../api/data";
import { GlassSheet } from "../../components/glass/GlassSheet";
import { PrimaryButton } from "../../components/ui/Buttons";
import { AmountInput, FormField } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";

/** 月の予算を決めるシート。0円も設定できる。「翌月から12か月先まで同じ金額」も選べる */
function BudgetSheet({
  open,
  onClose,
  yearMonth,
  current,
}: {
  open: boolean;
  onClose: () => void;
  yearMonth: YearMonth;
  current: number | null;
}) {
  const { t, locale } = useT();
  const put = usePutBudget();
  // 初期値はいまの予算。呼び出し側が開くたびに key を変えて作り直す
  const [amount, setAmount] = useState(current === null ? "" : formatNumber(current));
  const [future, setFuture] = useState(false);
  const [touched, setTouched] = useState(false);
  const parsed = parseAmountInput(amount, { allowZero: true });

  const submit = () => {
    setTouched(true);
    if (!parsed.ok) return;
    put.mutate({ yearMonth, amount: parsed.value, applyToFuture: future }, { onSuccess: onClose });
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={t("budget.title", { month: formatMonth(yearMonth, locale) })}
      footer={
        <div className="flex flex-col gap-3">
          {put.isError && (
            <p role="alert" className="text-[14px] font-medium text-amber">
              {t(errorKey(put.error))}
            </p>
          )}
          <PrimaryButton tone="dark" fullWidth loading={put.isPending} onClick={submit}>
            {t("common.save")}
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
        <FormField label={t("budget.amount")} required error={touched && !parsed.ok ? t(`amount.${parsed.error}`) : undefined}>
          {(f) => <AmountInput {...f} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="180,000" />}
        </FormField>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]">
          <input type="checkbox" checked={future} onChange={(e) => setFuture(e.target.checked)} className="size-5 accent-white" />
          {t("budget.applyFuture")}
        </label>
        {/* Enter で送信できるように（見えない・読み上げない送信ボタン） */}
        <button type="submit" hidden />
      </form>
    </GlassSheet>
  );
}

/** 予算のシートを開く仕組み（ホーム・設定で共通） */
export function useBudgetSheet() {
  const [state, setState] = useState<{ open: boolean; yearMonth: YearMonth; current: number | null; key: number }>({
    open: false,
    yearMonth: "2000-01",
    current: null,
    key: 0,
  });
  return {
    open: (yearMonth: YearMonth, current: number | null) => setState((s) => ({ open: true, yearMonth, current, key: s.key + 1 })),
    element: (
      <BudgetSheet
        key={`budget-${state.key}`}
        open={state.open}
        onClose={() => setState((s) => ({ ...s, open: false }))}
        yearMonth={state.yearMonth}
        current={state.current}
      />
    ),
  };
}
