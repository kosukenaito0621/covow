import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME, isThemeId, THEMES, type ThemeId, type ThemeMeta } from "./themes";

/*
 * テーマの切り替え。<html data-theme="..."> を書き換え、CSS の変数で色が変わる。
 * いまは端末に覚えておく（ログインの実装後に、アカウントの設定と同期する）。
 */

const STORAGE_KEY = "covow-theme";

interface ThemeContextValue {
  theme: ThemeMeta;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const readStored = (): ThemeId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isThemeId(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export function ThemeProvider({ children, initial }: { children: ReactNode; initial?: ThemeId }) {
  const [id, setId] = useState<ThemeId>(() => initial ?? readStored());

  useEffect(() => {
    document.documentElement.dataset.theme = id;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", THEMES[id].metaColor);
  }, [id]);

  const setTheme = useCallback((next: ThemeId) => {
    setId(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 保存できなくても、この画面の間は切り替わる
    }
  }, []);

  const value = useMemo(() => ({ theme: THEMES[id], setTheme }), [id, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("ThemeProvider の内側で使ってください");
  return ctx;
}
