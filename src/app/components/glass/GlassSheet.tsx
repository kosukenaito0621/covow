import { animate, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { CircleIconButton } from "../ui/Buttons";

/**
 * 下から出るスモークガラスのシート。ネイティブの <dialog> を使い、
 * フォーカスの閉じ込め・Esc で閉じる・背後の無効化はブラウザに任せる。
 */
export function GlassSheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      if (reduce) {
        animate(el, { opacity: [0, 1] }, { duration: 0.15 });
      } else {
        animate(el, { y: ["100%", "0%"], opacity: [0.6, 1] }, { duration: 0.32, ease: [0.22, 1, 0.36, 1] });
      }
    } else if (!open && el.open) {
      const out = reduce
        ? animate(el, { opacity: 0 }, { duration: 0.15 })
        : animate(el, { y: "100%" }, { duration: 0.22, ease: [0.4, 0, 1, 1] });
      out.then(() => el.close());
    }
  }, [open, reduce]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      data-contrast-scope
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // 背景（シートの外）を押したら閉じる
        if (e.target === e.currentTarget) onClose();
      }}
      className="glass-sheet overlay-glass-dark fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[92dvh] w-full max-w-[var(--app-max)] overflow-hidden rounded-t-[32px] border-b-0 p-0 backdrop:bg-[rgb(17_24_39/0.35)]"
    >
      {open && (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/35" aria-hidden="true" />
          <header className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
            <h2 id={titleId} className="text-[17px] font-semibold">
              {title}
            </h2>
            <CircleIconButton icon="close" label="閉じる" onClick={onClose} />
          </header>
          <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && (
            <footer className="border-t border-white/12 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  );
}
