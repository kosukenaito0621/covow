import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { type Mission, MISSIONS, type TourEvent } from "./missions";

/*
 * 「やってみましょう」の進み具合。端末（localStorage）に、ユーザーごとに保存する。
 * - open：コーチを出しているか
 * - current：いま案内しているミッション（「始める」を押したもの。光る枠はこのミッションだけ）
 * - done：終えたミッション
 * - celebrated：すべて終えたお祝いを出したか（一度だけ）
 */

interface TourState {
  open: boolean;
  current: string | null;
  done: string[];
  celebrated: boolean;
}

const EMPTY: TourState = { open: false, current: null, done: [], celebrated: false };
const keyOf = (userId: string) => `covow-tour:${userId}`;

function load(userId: string, defaultOpen: boolean): TourState {
  try {
    const raw = localStorage.getItem(keyOf(userId));
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<TourState>) };
  } catch {
    // 読めなければ最初から
  }
  return { ...EMPTY, open: defaultOpen };
}

interface TourValue {
  missions: readonly Mission[];
  state: TourState;
  /** いま案内しているミッション（なければ null） */
  active: Mission | null;
  /** 次に案内するミッション（終えていないものの先頭） */
  next: Mission | null;
  /** 直前に終えたミッション（「完了しました」の表示用。次の操作で消える） */
  justDone: Mission | null;
  show: () => void;
  hide: () => void;
  start: (id: string) => void;
  reset: () => void;
  markCelebrated: () => void;
}

const TourContext = createContext<TourValue | null>(null);

/** userId が null（ログイン前）なら何もしない。体験版の人には最初からコーチを出す */
export function TourProvider({ userId, isGuest, children }: { userId: string | null; isGuest: boolean; children: ReactNode }) {
  const missions = useMemo(() => MISSIONS.filter((m) => isGuest || !m.trialOnly), [isGuest]);
  const [state, setState] = useState<TourState>(() => (userId ? load(userId, isGuest) : EMPTY));
  const [loadedFor, setLoadedFor] = useState(userId);
  const [justDone, setJustDone] = useState<Mission | null>(null);

  // 別の人に替わったら、その人の進み具合を読み直す（描画中に1回だけ）
  if (loadedFor !== userId) {
    setLoadedFor(userId);
    setState(userId ? load(userId, isGuest) : EMPTY);
    setJustDone(null);
  }

  const save = useCallback(
    (next: TourState) => {
      setState(next);
      if (!userId) return;
      try {
        localStorage.setItem(keyOf(userId), JSON.stringify(next));
      } catch {
        // 保存できなくても、この画面の間は進む
      }
    },
    [userId],
  );

  // 操作が終わった合図を受け取り、案内中（または未完了）のミッションを完了にする
  useEffect(() => {
    if (!userId) return;
    const onEvent = (e: Event) => {
      const ev = (e as CustomEvent<TourEvent>).detail;
      const m = missions.find((x) => x.event === ev);
      if (!m || state.done.includes(m.id) || !state.open) return;
      save({ ...state, done: [...state.done, m.id], current: state.current === m.id ? null : state.current });
      setJustDone(m);
    };
    window.addEventListener("covow-tour", onEvent);
    return () => window.removeEventListener("covow-tour", onEvent);
  }, [userId, missions, state, save]);

  const value = useMemo<TourValue>(() => {
    const next = missions.find((m) => !state.done.includes(m.id)) ?? null;
    return {
      missions,
      state,
      active: missions.find((m) => m.id === state.current) ?? null,
      next,
      justDone,
      show: () => save({ ...state, open: true }),
      hide: () => save({ ...state, open: false, current: null }),
      start: (id) => {
        setJustDone(null);
        save({ ...state, open: true, current: id });
      },
      reset: () => {
        setJustDone(null);
        save({ ...EMPTY, open: true });
      },
      markCelebrated: () => save({ ...state, celebrated: true }),
    };
  }, [missions, state, justDone, save]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("TourProvider の内側で使ってください");
  return ctx;
}

/** 初期設定を終えた人に、ホームでガイドを勧めるための印（ユーザーごとに一度だけ） */
export const offerKey = (userId: string) => `covow-tour-offer:${userId}`;
