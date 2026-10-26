import { type ReactNode, useState } from "react";

/**
 * 読み込みが終わった中身を、ぼかし＋透明からくっきり浮かび上がらせる（ブラーアップ。動きは app.css の .reveal）。
 * 動きを減らす設定の人には、ぼかさず短いフェードだけにする。
 * active が false なら動かさない（すでに手元にあるデータを出すときに、毎回ふわっとさせないため）。
 */
export function Reveal({ children, className, active = true }: { children: ReactNode; className?: string; active?: boolean }) {
  return <div className={`${active ? "reveal" : ""} ${className ?? ""}`}>{children}</div>;
}

/** この画面を開いた時点で読み込み中だったか（そのときだけ Reveal を動かす） */
export function useStartedLoading(pending: boolean): boolean {
  const [started] = useState(pending);
  return started;
}

/** 月を切り替えて新しい中身を待っている間、前の中身を薄く残す（app.css の .stale-area）。aria-busy で読み込み中を伝える */
export function Stale({ stale, children, className }: { stale: boolean; children: ReactNode; className?: string }) {
  return (
    <div aria-busy={stale || undefined} className={`stale-area ${stale ? "is-stale" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}
