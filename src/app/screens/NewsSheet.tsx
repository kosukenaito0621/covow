import { dateLocale, formatLongDate, textLocale } from "@shared/i18n";
import type { NewsItem } from "@shared/news";
import { GlassSheet } from "../components/glass/GlassSheet";
import { useT } from "../i18n/I18nProvider";
import { phrase } from "../i18n/phrases";

/**
 * 運営からのお知らせの一覧（新しい順）。見出しと日付は画面の言語、本文は意味を読む文なので Mix では日本語。
 * unreadIds に入っているものに「New」の印を付ける（開いた時点の未読）。
 */
export function NewsSheet({
  open,
  onClose,
  items,
  unreadIds,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly NewsItem[];
  unreadIds: ReadonlySet<string>;
}) {
  const { t, locale } = useT();
  const titleLang = dateLocale(locale);
  const bodyLang = textLocale(locale);
  return (
    <GlassSheet open={open} onClose={onClose} title={t("news.title")}>
      {items.length === 0 ? (
        <p className="py-6 text-center text-[15px] text-white/85">{t("news.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/12 pb-[env(safe-area-inset-bottom)]">
          {items.map((n) => (
            <li key={n.id} className="py-4 first:pt-1">
              <article aria-labelledby={`news-${n.id}`}>
                <p className="flex items-center gap-2 text-[13px] text-white/80">
                  <time dateTime={n.date}>{formatLongDate(n.date, locale)}</time>
                  {unreadIds.has(n.id) && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#111827]">New</span>
                  )}
                </p>
                <h3 id={`news-${n.id}`} lang={titleLang} className="mt-1 text-[17px] leading-snug font-semibold">
                  {phrase(n.title[titleLang])}
                </h3>
                <p lang={bodyLang} className="mt-2 text-[15px] leading-relaxed whitespace-pre-line text-white/90">
                  {phrase(n.body[bodyLang])}
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </GlassSheet>
  );
}
