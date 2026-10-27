import { formatYen } from "@shared/money/amount";
import { type Split, splitAmounts } from "@shared/money/split";
import { useT } from "../../i18n/I18nProvider";
import { ChoiceChips } from "./fields";

const SPLIT = "__split__";

/**
 * 払う人（自分／ほかのメンバー／分ける）と、分けるときの相手と割合（10%きざみ）。
 * メンバーが1人なら何も出さない（いつも自分が 100%）。割合を変えると、それぞれの金額をその場で出す。
 */
export function PayerField({
  members,
  me,
  amount,
  value,
  onChange,
}: {
  members: readonly { id: string; name: string }[];
  me: string;
  /** 入力中の金額（まだ正しくなければ null。金額の表示を省く） */
  amount: number | null;
  value: Split;
  onChange: (v: Split) => void;
}) {
  const { t } = useT();
  if (members.length < 2) return null;
  const nameOf = (id: string) => (id === me ? t("payer.me") : (members.find((m) => m.id === id)?.name ?? ""));
  const others = members.filter((m) => m.id !== value.payerUserId);
  const choose = (v: string) => {
    if (v !== SPLIT) return onChange({ payerUserId: v, splitUserId: null, payerRatio: 100 });
    if (value.splitUserId) return;
    onChange({ payerUserId: value.payerUserId, splitUserId: others[0]!.id, payerRatio: 50 });
  };
  const step = (delta: number) => onChange({ ...value, payerRatio: Math.min(90, Math.max(10, value.payerRatio + delta)) });
  const shares = amount !== null ? splitAmounts(amount, value.payerRatio) : null;

  return (
    <div className="flex flex-col gap-3">
      <ChoiceChips
        label={t("payer.label")}
        value={value.splitUserId ? SPLIT : value.payerUserId}
        onChange={choose}
        options={[...members.map((m) => ({ value: m.id, label: nameOf(m.id) })), { value: SPLIT, label: t("payer.split") }]}
      />
      {value.splitUserId && (
        <>
          {others.length > 1 && (
            <ChoiceChips
              label={t("payer.with")}
              value={value.splitUserId}
              onChange={(id) => onChange({ ...value, splitUserId: id })}
              options={others.map((m) => ({ value: m.id, label: nameOf(m.id) }))}
            />
          )}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] font-semibold">{t("payer.ratio")}</legend>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => step(-10)}
                disabled={value.payerRatio <= 10}
                aria-label={t("payer.less", { name: nameOf(value.payerUserId) })}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-[20px] disabled:opacity-40"
              >
                −
              </button>
              <p className="num flex-1 text-center text-[15px] font-semibold" aria-live="polite">
                {nameOf(value.payerUserId)} {value.payerRatio}% ・ {nameOf(value.splitUserId)} {100 - value.payerRatio}%
                {shares && (
                  <span className="block text-[13px] font-medium text-white/85">
                    {formatYen(shares.payer)} ・ {formatYen(shares.other)}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={() => step(10)}
                disabled={value.payerRatio >= 90}
                aria-label={t("payer.more", { name: nameOf(value.payerUserId) })}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/30 text-[20px] disabled:opacity-40"
              >
                ＋
              </button>
            </div>
          </fieldset>
        </>
      )}
    </div>
  );
}
