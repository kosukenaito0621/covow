import { type ReactNode, useEffect, useId, useRef } from "react";
import { useT } from "../../i18n/I18nProvider";
import { PrimaryButton, SecondaryButton } from "../ui/Buttons";

/** 確認ダイアログ。取り消しにくい操作の前に出す */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const bodyId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="overlay-glass-light m-auto w-[calc(100%-32px)] max-w-[360px] rounded-[28px] p-0 backdrop:bg-[rgb(17_24_39/0.35)]"
    >
      {open && (
        <div className="flex flex-col gap-3 p-5">
          <h2 id={titleId} className="text-[17px] font-semibold">
            {title}
          </h2>
          {body && (
            <div id={bodyId} className="text-[15px] text-ink-muted">
              {body}
            </div>
          )}
          <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <SecondaryButton onClick={onCancel} disabled={busy}>
              {cancelLabel ?? t("common.cancel")}
            </SecondaryButton>
            <PrimaryButton onClick={onConfirm} loading={busy ?? false}>
              {confirmLabel}
            </PrimaryButton>
          </div>
        </div>
      )}
    </dialog>
  );
}
