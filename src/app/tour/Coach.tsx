import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api/client";
import { Icon } from "../components/ui/Icon";
import { type Mission, tourEvent } from "./missions";
import { useTour } from "./TourProvider";

/*
 * 「やってみましょう」のコーチ（画面の下、ナビの上）と、押す場所を囲む光る枠。
 * まわりは暗くせず、ふだんどおり操作できる。文言は日本語だけ（lang="ja" を付けて読み上げも日本語にする）。
 */

export function Coach() {
  const tour = useTour();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [listOpen, setListOpen] = useState(false);
  const [calling, setCalling] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const { state, missions, active, next, justDone } = tour;

  // コーチの高さを --coach-h に入れ、右下の＋ボタンがコーチに隠れないよう上にずらす
  useEffect(() => {
    const root = document.documentElement;
    const el = panel.current;
    if (!state.open || !el) {
      root.style.setProperty("--coach-h", "0px");
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty("--coach-h", `${el.offsetHeight + 12}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.setProperty("--coach-h", "0px");
    };
  }, [state.open]);

  if (!state.open) return null;

  const total = missions.length;
  const doneCount = missions.filter((m) => state.done.includes(m.id)).length;
  const allDone = doneCount === total;

  const begin = (m: Mission) => {
    setListOpen(false);
    tour.start(m.id);
    void navigate({ to: m.to });
  };

  // メンバー役を呼ぶ（体験版だけ）
  const runAction = async (m: Mission) => {
    if (m.id !== "partner") return;
    setCalling(true);
    try {
      await api("/trial/partner-visit", { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["plans"] });
      await qc.invalidateQueries({ queryKey: ["summary"] });
      tourEvent("partner-visited");
      void navigate({ to: "/plans" });
    } finally {
      setCalling(false);
    }
  };

  let body;
  if (listOpen) {
    body = (
      <>
        <Header label={`やってみましょう ${doneCount}/${total}`} onClose={() => setListOpen(false)} closeLabel="一覧を閉じる" />
        <ul className="mt-2 flex max-h-[40dvh] flex-col overflow-y-auto">
          {missions.map((m, i) => {
            const done = state.done.includes(m.id);
            return (
              <li key={m.id}>
                <button type="button" onClick={() => begin(m)} className="flex min-h-11 w-full items-center gap-3 rounded-[12px] px-2 text-left text-[14px] hover:bg-white/8">
                  <span
                    aria-hidden="true"
                    className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${done ? "bg-white text-[#111827]" : "border border-white/40"}`}
                  >
                    {done ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  <span className={done ? "text-white/80" : "font-medium"}>{m.title}</span>
                  <span className="sr-only">{done ? "（完了）" : ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </>
    );
  } else if (allDone && !state.celebrated) {
    body = (
      <>
        <Header label={`やってみましょう ${doneCount}/${total}`} onClose={() => tour.markCelebrated()} />
        <p className="mt-2 text-[17px] font-semibold">すべて完了しました</p>
        <p className="mt-1 text-[14px] leading-relaxed text-white/90">基本の使い方はこれで以上です。設定からいつでも、もう一度ご覧いただけます。</p>
        <div className="mt-3 flex gap-2">
          <PrimaryCoachButton onClick={() => tour.markCelebrated()}>閉じる</PrimaryCoachButton>
        </div>
      </>
    );
  } else if (allDone) {
    body = (
      <>
        <Header label={`やってみましょう ${doneCount}/${total}`} onClose={() => tour.hide()} />
        <p className="mt-2 text-[15px]">すべてのミッションを完了しています。</p>
        <div className="mt-3 flex gap-2">
          <SecondaryCoachButton onClick={() => setListOpen(true)}>一覧</SecondaryCoachButton>
          <SecondaryCoachButton onClick={() => tour.reset()}>最初から</SecondaryCoachButton>
        </div>
      </>
    );
  } else if (justDone && !active) {
    body = (
      <>
        <Header label={`やってみましょう ${doneCount}/${total}`} onClose={() => tour.hide()} />
        <p className="mt-2 flex items-center gap-2 text-[15px] font-semibold">
          <Icon name="check" size={18} />「{justDone.title}」が完了しました
        </p>
        {next && <p className="mt-1 text-[14px] text-white/90">次は「{next.title}」です。</p>}
        <div className="mt-3 flex gap-2">
          {next && <PrimaryCoachButton onClick={() => begin(next)}>次へ</PrimaryCoachButton>}
          <SecondaryCoachButton onClick={() => tour.hide()}>あとで</SecondaryCoachButton>
        </div>
      </>
    );
  } else {
    const m = active ?? next!;
    body = (
      <>
        <Header label={`やってみましょう ${doneCount}/${total}`} onClose={() => tour.hide()} />
        <p className="mt-2 text-[17px] font-semibold">{m.title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-white/90">{m.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {m.action && active ? (
            <PrimaryCoachButton onClick={() => void runAction(m)} disabled={calling}>
              {m.action.label}
            </PrimaryCoachButton>
          ) : (
            !active && <PrimaryCoachButton onClick={() => begin(m)}>始める</PrimaryCoachButton>
          )}
          <SecondaryCoachButton onClick={() => setListOpen(true)}>一覧</SecondaryCoachButton>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        ref={panel}
        data-fixed-overlay
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-40 flex justify-center px-4"
      >
        <AnimatePresence mode="wait">
          <motion.section
            key={listOpen ? "list" : (active?.id ?? justDone?.id ?? (allDone ? "all" : next?.id))}
            lang="ja"
            aria-label="やってみましょう"
            aria-live="polite"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22 }}
            className="overlay-glass-dark pointer-events-auto w-full max-w-[calc(var(--app-max)-32px)] rounded-[24px] px-4 pt-3 pb-4 text-white"
          >
            {body}
          </motion.section>
        </AnimatePresence>
      </div>
      {active && <Spotlight targets={active.targets} />}
    </>
  );
}

function Header({ label, onClose, closeLabel = "ガイドを閉じる" }: { label: string; onClose: () => void; closeLabel?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[12px] font-semibold tracking-[0.08em] text-white/90">{label}</p>
      <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} className="-mr-2 inline-flex size-11 items-center justify-center rounded-full">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

function PrimaryCoachButton(props: { onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[14px] font-semibold text-[#111827] disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

function SecondaryCoachButton(props: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={props.onClick} className="inline-flex min-h-11 items-center rounded-full border border-white/35 px-5 text-[14px] font-semibold">
      {props.children}
    </button>
  );
}

/**
 * 押す場所を光る枠で囲む。targets の順に探し、最初に見つかったものを囲む（シートの中の送信ボタンを優先するなど）。
 * シート（<dialog>）の中にあるときは、そのシートの中に枠を描く（シートは一番手前に出るため）。
 */
function Spotlight({ targets }: { targets: string[] }) {
  const [box, setBox] = useState<{ el: Element; rect: DOMRect; host: HTMLElement | null } | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      let found: Element | null = null;
      for (const t of targets) {
        found = [...document.querySelectorAll(`[data-tour="${t}"]`)].find((el) => el.getClientRects().length > 0) ?? null;
        if (found) break;
      }
      const rect = found?.getBoundingClientRect();
      const host = (found?.closest("dialog[open]") as HTMLElement | null) ?? null;
      const sig = rect ? `${rect.x},${rect.y},${rect.width},${rect.height},${!!host}` : "";
      if (sig !== last) {
        last = sig;
        setBox(found && rect ? { el: found, rect, host } : null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [targets]);

  if (!box) return null;
  const pad = 6;
  const hostRect = box.host?.getBoundingClientRect();
  const style = {
    left: box.rect.left - pad - (hostRect?.left ?? 0),
    top: box.rect.top - pad - (hostRect?.top ?? 0),
    width: box.rect.width + pad * 2,
    height: box.rect.height + pad * 2,
  };
  const ring = (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={style}
      className={`pointer-events-none ${box.host ? "absolute" : "fixed"} z-50 rounded-[22px] border-2 border-white shadow-[0_0_0_2px_rgb(17_24_39/0.7),0_0_0_6px_rgb(255_255_255/0.35),0_0_28px_6px_rgb(255_255_255/0.5)] motion-safe:animate-pulse`}
    />
  );
  return createPortal(ring, box.host ?? document.body);
}
