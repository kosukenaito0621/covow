import { GlassCard } from "../components/glass/GlassCard";
import { Icon } from "../components/ui/Icon";
import { mutedText } from "../components/ui/SectionLabel";
import { ErrorMessage } from "../components/ui/States";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

export interface CowelLinkCardProps {
  linked: boolean;
  /** いま出している番号（発行した応答でだけ分かる。10分で使えなくなる） */
  code: { code: string; expiresAt: string } | null;
  busy?: boolean;
  error?: boolean;
  onCreateCode?: () => void;
  onRevoke?: () => void;
}

/** COWEL（家計簿アプリ）との連携。番号を出して COWEL の設定に入れてもらう。連携中なら「やめる」 */
export function CowelLinkCard({ linked, code, busy, error, onCreateCode, onRevoke }: CowelLinkCardProps) {
  const { t } = useT();
  const { theme } = useTheme();
  const muted = mutedText(theme.tone.card);
  const until = code ? new Date(code.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <GlassCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[13px] ${muted}`}>{t("settings.cowelBody")}</p>
        {linked && <span className="shrink-0 rounded-full bg-white/40 px-2.5 py-1 text-[12px] font-semibold">{t("settings.cowelLinked")}</span>}
      </div>
      {code && (
        <div role="status" className="flex flex-col items-center gap-1 rounded-[16px] bg-white/30 py-3">
          <span className="num text-[30px] font-bold tracking-[0.2em]" aria-label={t("settings.cowelCodeLabel")}>
            {code.code}
          </span>
          <span className={`text-[12px] ${muted}`}>{t("settings.cowelCodeHint", { time: until })}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onCreateCode} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-full bg-white/50 px-4 text-[14px] font-semibold disabled:opacity-60">
          <Icon name="arrowUpRight" size={18} />
          {t(linked ? "settings.cowelReconnect" : "settings.cowelConnect")}
        </button>
        {linked && (
          <button type="button" onClick={onRevoke} disabled={busy} className="min-h-11 rounded-full px-4 text-[14px] font-medium disabled:opacity-60">
            {t("settings.cowelDisconnect")}
          </button>
        )}
      </div>
      {error && <ErrorMessage tone={theme.tone.card} message={t("common.saveError")} />}
    </GlassCard>
  );
}
