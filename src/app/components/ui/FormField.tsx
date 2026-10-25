import { type ComponentProps, type ReactNode, useId } from "react";

type Tone = "light" | "dark";

/**
 * フォームの項目。ラベルは必ず付け、エラーは aria-describedby で項目と結びつける。
 * エラーがあっても入力中の内容は消さない（値は呼び出し側が保持する）。
 */
export function FormField({
  label,
  hint,
  error,
  required,
  tone = "dark",
  children,
}: {
  label: string;
  hint?: string;
  error?: string | undefined;
  required?: boolean;
  tone?: Tone;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const muted = tone === "dark" ? "text-white/78" : "text-ink-muted";
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold">
        {label}
        {required ? <span className={`ml-1 text-xs font-normal ${muted}`}>必須</span> : null}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className={`text-xs ${muted}`}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={`text-[13px] font-medium ${tone === "dark" ? "text-amber" : "text-attention-ink"}`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({ tone = "dark", className, ...rest }: ComponentProps<"input"> & { tone?: Tone }) {
  const color =
    tone === "dark"
      ? "border-white/25 bg-white/8 text-white placeholder:text-white/55 aria-invalid:border-amber"
      : "border-ink/18 bg-white/80 text-ink placeholder:text-ink-muted/70 aria-invalid:border-attention-ink";
  return <input className={`min-h-12 w-full rounded-[16px] border px-4 text-[16px] ${color} ${className ?? ""}`} {...rest} />;
}

/** 金額入力。inputmode="numeric" でテンキーを出し、全角・カンマ・¥ も受け付ける */
export function AmountInput(props: Omit<ComponentProps<"input">, "type" | "inputMode"> & { tone?: Tone }) {
  return <TextInput {...props} type="text" inputMode="numeric" autoComplete="off" className="num" />;
}
