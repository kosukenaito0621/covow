import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, isLocale, type Locale, type MessageKey, type Params, translate } from "@shared/i18n";

/*
 * 画面の言語。最初は英語で、設定で日本語に切り替えられる。
 * いまは端末に覚えておく（ログインの実装後に、アカウントの設定と同期する）。
 * やってみよう（伴走ガイド）だけは、言語の設定に関係なく日本語で表示する（forceLocale="ja"）。体験版の画面は設定に従う。
 */

const STORAGE_KEY = "covow-locale";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, params?: Params) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

const initialLocale = (): Locale => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (isLocale(v)) return v;
  } catch {
    // 読めなければ既定の言語
  }
  return DEFAULT_LOCALE;
};

export function I18nProvider({ children, forceLocale }: { children: ReactNode; forceLocale?: Locale }) {
  const [stored, setStored] = useState<Locale>(initialLocale);
  const locale = forceLocale ?? stored;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setStored(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // 保存できなくても、この画面の間は切り替わる
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: (key, params) => translate(locale, key, params) }),
    [locale, setLocale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider の内側で使ってください");
  return ctx;
}
