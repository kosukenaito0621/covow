import type { ReactNode } from "react";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import { Icon, type IconName } from "./Icon";

type Tone = "light" | "dark";

/** 空状態。次にできることへ誘導する */
export function EmptyState({
  icon = "receipt",
  title,
  body,
  action,
  tone = "light",
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
  tone?: Tone;
}) {
  const muted = tone === "dark" ? "text-white/78" : "text-ink-muted";
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
      <span
        className={`mb-1 inline-flex size-12 items-center justify-center rounded-full border ${
          tone === "dark" ? "border-white/25 text-white" : "border-ink/15 text-ink"
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
      <p className="text-[15px] font-semibold">{title}</p>
      {body && <p className={`max-w-[28ch] text-[13px] ${muted}`}>{body}</p>}
      {action && (
        <PrimaryButton tone={tone} icon="plus" className="mt-2" onClick={action.onClick}>
          {action.label}
        </PrimaryButton>
      )}
    </div>
  );
}

/** エラー表示。事実と次にできることを書き、再試行ボタンを付ける */
export function ErrorMessage({
  message = "読み込めませんでした。通信状況を確認して、もう一度お試しください",
  onRetry,
  tone = "light",
}: {
  message?: string;
  onRetry?: () => void;
  tone?: Tone;
}) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-3 rounded-[20px] border px-4 py-3 ${
        tone === "dark" ? "border-white/20 bg-white/6 text-white" : "border-ink/12 bg-white/70 text-ink"
      }`}
    >
      <p className="flex items-start gap-2 text-[15px]">
        <Icon name="attention" size={20} className="mt-0.5 shrink-0" />
        {message}
      </p>
      {onRetry && (
        <SecondaryButton tone={tone} icon="refresh" onClick={onRetry}>
          もう一度読み込む
        </SecondaryButton>
      )}
    </div>
  );
}

/** 読み込み中のスケルトン */
export function Skeleton({ className, tone = "light" }: { className?: string; tone?: Tone }) {
  return <div aria-hidden="true" className={`skeleton ${tone === "dark" ? "skeleton-dark" : ""} ${className ?? ""}`} />;
}

export function LoadingSkeleton({ label = "読み込み中", children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** 予算超過などの注意（アンバー。赤は使わない） */
export function AttentionNote({ children, tone = "light" }: { children: ReactNode; tone?: Tone }) {
  // 暗いシートの上ではアンバーの文字、明るい面では濃いアンバーの文字にする
  const color =
    tone === "dark" ? "border border-amber/40 bg-amber/12 text-amber" : "bg-amber/45 text-attention-ink";
  return (
    <p role="status" className={`flex items-start gap-2 rounded-2xl px-3 py-2 text-[13px] font-medium ${color}`}>
      <Icon name="attention" size={18} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
