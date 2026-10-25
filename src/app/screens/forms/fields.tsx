import { useId } from "react";
import { useT } from "../../i18n/I18nProvider";

/** 選べるものを横に並べたチップ（ラジオボタンの役割）。シートの中（暗い面）で使う */
export function ChoiceChips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-[14px] font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-white ${
              value === o.value ? "border-white bg-white text-[#111827]" : "border-white/30 text-white"
            }`}
          >
            <input type="radio" name={id} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const NONE = "__none__";

/** カテゴリを選ぶ（未分類も選べる） */
export function CategoryChoice({
  value,
  onChange,
  categories,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  categories: readonly { id: string; name: string }[];
}) {
  const { t } = useT();
  return (
    <ChoiceChips
      label={t("plan.category")}
      value={value ?? NONE}
      onChange={(v) => onChange(v === NONE ? null : v)}
      options={[...categories.map((c) => ({ value: c.id, label: c.name })), { value: NONE, label: t("badge.uncategorized") }]}
    />
  );
}

/** 複数行のメモ欄（暗い面用） */
export function MemoInput(props: { id: string; value: string; onChange: (v: string) => void; maxLength: number }) {
  return (
    <textarea
      id={props.id}
      rows={3}
      maxLength={props.maxLength}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      className="w-full rounded-[16px] border border-white/25 bg-white/8 px-4 py-3 text-[16px] text-white placeholder:text-white/55"
    />
  );
}
