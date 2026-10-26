import { useCallback, useMemo, useSyncExternalStore } from "react";
import { NEWS, sortNews, unreadIds as unreadOf } from "@shared/news";

/*
 * お知らせを読んだかどうか。端末（localStorage）に、ユーザーごとに保存する（サーバーには送らない）。
 * 一覧を開いたら、そのとき出ているお知らせをすべて読んだことにする。
 */
const keyOf = (userId: string) => `covow-news-read:${userId}`;
const EVENT = "covow-news-read";

function readIds(userId: string | null): string {
  if (!userId) return "[]";
  try {
    return localStorage.getItem(keyOf(userId)) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** userId が null（ログイン前）なら、未読は 0 として扱う */
export function useNews(userId: string | null) {
  const raw = useSyncExternalStore(subscribe, () => readIds(userId));
  const items = useMemo(() => sortNews(NEWS), []);
  const read = useMemo(() => {
    try {
      return new Set(JSON.parse(raw) as string[]);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  const markAllRead = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.setItem(keyOf(userId), JSON.stringify(NEWS.map((n) => n.id)));
    } catch {
      // 保存できなくても一覧は読める（次に開いたときも未読のまま）
    }
    window.dispatchEvent(new Event(EVENT));
  }, [userId]);
  const unreadIds = useMemo(() => (userId ? unreadOf(items, read) : new Set<string>()), [items, read, userId]);
  return { items, unread: unreadIds.size, unreadIds, markAllRead };
}
