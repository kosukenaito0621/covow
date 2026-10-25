import { type ReactNode, useState } from "react";
import type { YearMonth } from "@shared/date/jst";
import { formatMonth, type Locale } from "@shared/i18n";
import type { ThemeId } from "@shared/theme";
import { formatYen } from "@shared/money/amount";
import { GlassCard } from "../components/glass/GlassCard";
import { TabChips } from "../components/glass/TabChips";
import { ThemePicker } from "../components/settings/ThemePicker";
import { Avatar } from "../components/ui/Avatar";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { Icon, type IconName } from "../components/ui/Icon";
import { mutedText, SectionLabel } from "../components/ui/SectionLabel";
import { ErrorMessage } from "../components/ui/States";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import type { MemberView } from "./types";

export interface SettingsData {
  me: { name: string; email: string };
  /** スペース・予算・カテゴリは、まだ作っていない段階では null（その欄を出さない） */
  space: {
    name: string;
    members: readonly MemberView[];
    max: number;
    /** 発行済みの招待リンク（空きがあるときだけ） */
    invite: { url: string; hours: number } | null;
  } | null;
  budgets: readonly { yearMonth: YearMonth; amount: number | null }[] | null;
  categories: readonly string[] | null;
}

export interface SettingsActions {
  /** テーマ・言語を変えたとき（画面はすぐ切り替わる。アカウントへの保存はここで行う） */
  onPreferenceChange?: (patch: { theme?: ThemeId; locale?: Locale }) => void;
  onSignOut?: () => void;
  signingOut?: boolean;
  signOutError?: boolean;
}

/** 設定。テーマと言語はその場で切り替わり、onPreferenceChange でアカウントにも保存する */
export function SettingsScreen({ data: d, actions = {} }: { data: SettingsData; actions?: SettingsActions }) {
  const { t, locale, setLocale } = useT();
  const { theme, setTheme } = useTheme();
  const muted = mutedText(theme.tone.card);
  const [copied, setCopied] = useState(false);
  const space = d.space;
  const alone = (space?.members.length ?? 0) <= 1;
  const seats = space ? Math.max(0, space.max - space.members.length) : 0;
  const changeTheme = (id: ThemeId) => {
    setTheme(id);
    actions.onPreferenceChange?.({ theme: id });
  };
  const changeLocale = (l: Locale) => {
    setLocale(l);
    actions.onPreferenceChange?.({ locale: l });
  };

  return (
    <>
      <h1 className="text-[28px] leading-none font-bold tracking-tight">{t("settings.title")}</h1>

      <GlassCard className="flex items-center gap-3 px-4 py-4">
        <Avatar name={d.me.name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-semibold">{d.me.name}</p>
          <p className={`truncate text-[13px] ${muted}`}>{d.me.email}</p>
          <p className={`text-[12px] ${muted}`}>{t("settings.signedIn")}</p>
        </div>
        <RowIcon icon="edit" label={t("settings.displayName")} />
      </GlassCard>

      <Block id="set-theme" title={t("settings.theme")}>
        <GlassCard className="p-4">
          <ThemePicker label={t("settings.theme")} value={theme.id} onChange={changeTheme} />
        </GlassCard>
      </Block>

      <Block id="set-lang" title={t("settings.language")}>
        <TabChips
          label={t("settings.language")}
          value={locale}
          onChange={changeLocale}
          tone={theme.tone.page}
          options={[
            { value: "en", label: "English" },
            { value: "ja", label: "日本語" },
          ]}
        />
      </Block>

      {space && (
      <Block
        id="set-space"
        title={t("settings.space")}
        aside={<span className="num text-[12px] font-semibold">{t("settings.membersCount", { count: space.members.length, max: space.max })}</span>}
      >
        <GlassCard className="flex flex-col px-4 py-2">
          <Row label={t("settings.spaceName")} value={space.name} chevron />
          <ul className="flex flex-col py-2" aria-label={t("insights.members")}>
            {space.members.map((m) => (
              <li key={m.id} className="flex min-h-14 items-center gap-3">
                <Avatar name={m.name} />
                <span className="flex-1 truncate text-[15px] font-semibold">{m.name}</span>
                {m.isMe && (
                  <span className="rounded-full border border-current/25 px-2 py-0.5 text-[12px] font-semibold">{t("settings.you")}</span>
                )}
              </li>
            ))}
            {Array.from({ length: seats }, (_, i) => (
              <li key={`seat-${i}`} className={`flex min-h-14 items-center gap-3 ${muted}`}>
                <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-full border border-dashed border-current/45">
                  <Icon name="plus" size={18} />
                </span>
                <span className="text-[14px]">{t("settings.openSlot")}</span>
              </li>
            ))}
          </ul>
          {space.invite && (
            <div className="mb-2 flex flex-col gap-3 rounded-[18px] border border-current/15 p-4">
              <p className="flex items-center gap-2 text-[15px] font-semibold">
                <Icon name="share" size={18} />
                {t("settings.invite")}
              </p>
              <p className={`text-[13px] leading-relaxed ${muted}`}>{t("settings.inviteBody", { hours: space.invite.hours })}</p>
              <p className="num truncate rounded-[12px] bg-current/6 px-3 py-2 text-[13px]">{space.invite.url}</p>
              <PrimaryButton
                tone={theme.tone.card}
                icon={copied ? "check" : "copy"}
                onClick={() => {
                  void navigator.clipboard?.writeText(space.invite!.url).catch(() => undefined);
                  setCopied(true);
                }}
                aria-live="polite"
              >
                {copied ? t("settings.copied") : t("settings.copyLink")}
              </PrimaryButton>
            </div>
          )}
          <div className="border-t border-current/10 py-2">
            <SecondaryButton tone={theme.tone.card} icon="arrowLeft" disabled={alone} fullWidth aria-describedby={alone ? "leave-note" : undefined}>
              {t("settings.leave")}
            </SecondaryButton>
            {alone && (
              <p id="leave-note" className={`mt-2 text-center text-[12px] ${muted}`}>
                {t("settings.leaveLast")}
              </p>
            )}
          </div>
        </GlassCard>
      </Block>
      )}

      {d.budgets && (
      <Block id="set-budget" title={t("settings.budget")}>
        <GlassCard className="px-4 py-1">
          <ul className="divide-y divide-current/10">
            {d.budgets.map((b) => (
              <li key={b.yearMonth}>
                <Row
                  label={formatMonth(b.yearMonth, locale)}
                  value={b.amount === null ? <span className={muted}>{t("settings.notSet")}</span> : formatYen(b.amount)}
                  chevron
                />
              </li>
            ))}
          </ul>
        </GlassCard>
      </Block>
      )}

      {d.categories && (
      <Block id="set-cat" title={t("settings.categories")}>
        <GlassCard className="p-4">
          <ul className="flex flex-wrap gap-2">
            {d.categories.map((c) => (
              <li key={c}>
                <button type="button" className="inline-flex min-h-11 items-center rounded-full border border-current/25 px-4 text-[14px] font-medium">
                  {c}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-1 rounded-full border border-dashed border-current/45 px-4 text-[14px] font-semibold"
              >
                <Icon name="plus" size={16} />
                {t("settings.addCategory")}
              </button>
            </li>
          </ul>
        </GlassCard>
      </Block>
      )}

      <Block id="set-account" title={t("settings.account")}>
        <GlassCard className="px-2 py-1">
          <ActionRow icon="info" label={t("settings.tour")} />
          <ActionRow icon="arrowUpRight" label={t("settings.signOut")} onClick={actions.onSignOut} busy={actions.signingOut} />
          <ActionRow icon="trash" label={t("settings.deleteAccount")} danger />
        </GlassCard>
        {actions.signOutError && <ErrorMessage tone={theme.tone.page} message={t("settings.signOutError")} />}
      </Block>
    </>
  );
}

function Block({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel id={id}>{title}</SectionLabel>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, chevron }: { label: string; value: ReactNode; chevron?: boolean }) {
  return (
    <button type="button" className="flex min-h-13 w-full items-center justify-between gap-3 py-2 text-left">
      <span className="num text-[15px]">{label}</span>
      <span className="num flex items-center gap-1 text-[15px] font-semibold">
        {value}
        {chevron && <Icon name="chevronRight" size={18} className="opacity-70" />}
      </span>
    </button>
  );
}

function RowIcon({ icon, label }: { icon: IconName; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className="inline-flex size-11 items-center justify-center rounded-full border border-current/20">
      <Icon name={icon} size={18} />
    </button>
  );
}

function ActionRow({
  icon,
  label,
  danger,
  onClick,
  busy,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  busy?: boolean;
}) {
  const { theme } = useTheme();
  const dangerColor = theme.tone.card === "light" ? "text-[#86200f]" : "text-[#ffb4a8]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className={`flex min-h-13 w-full items-center gap-3 rounded-[16px] px-3 text-left text-[15px] font-medium disabled:opacity-60 ${danger ? dangerColor : ""}`}
    >
      <Icon name={icon} size={20} />
      {label}
    </button>
  );
}
