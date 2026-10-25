import { useState } from "react";
import { jstDateOfInstant } from "@shared/date/jst";
import { formatShortDate, type MessageKey } from "@shared/i18n";
import { LIMITS } from "@shared/schemas";
import { ConfirmDialog } from "../components/glass/ConfirmDialog";
import { GlassCard } from "../components/glass/GlassCard";
import { GlassSheet } from "../components/glass/GlassSheet";
import { Avatar } from "../components/ui/Avatar";
import { PrimaryButton, SecondaryButton } from "../components/ui/Buttons";
import { FormField, TextInput } from "../components/ui/FormField";
import { Icon } from "../components/ui/Icon";
import { mutedText } from "../components/ui/SectionLabel";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import type { MemberView } from "./types";

/** 招待リンクの状態。fresh＝いま作ったリンク（URL はこのときだけ見せられる） */
export type InviteState =
  | { kind: "none" }
  | { kind: "active"; expiresAt: string }
  | { kind: "fresh"; url: string; expiresAt: string };

export interface SpaceCardProps {
  name: string;
  members: readonly MemberView[];
  max: number;
  invite: InviteState;
  inviteHours: number;
  /** 直前の操作の失敗（言語に合わせた文の鍵） */
  error?: MessageKey | null;
  busy?: boolean;
  onRename?: (name: string) => Promise<unknown> | void;
  onCreateInvite?: () => void;
  onRevokeInvite?: () => void;
  onRemoveMember?: (id: string) => Promise<unknown> | void;
  onLeave?: () => Promise<unknown> | void;
}

/** 設定の「スペース」：名前、メンバー（空き枠つき）、招待リンク、メンバーを外す、抜ける */
export function SpaceCard(p: SpaceCardProps) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const tone = theme.tone.card;
  const muted = mutedText(tone);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(p.name);
  const [removing, setRemoving] = useState<MemberView | null>(null);
  const [leaving, setLeaving] = useState(false);
  const alone = p.members.length <= 1;
  const full = p.members.length >= p.max;
  const seats = Math.max(0, p.max - p.members.length);
  const until = (iso: string) => formatShortDate(jstDateOfInstant(new Date(iso)), locale);
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <GlassCard className="flex flex-col px-4 py-2">
        <button
          type="button"
          onClick={() => {
            setDraft(p.name);
            setRenaming(true);
          }}
          className="flex min-h-13 w-full items-center justify-between gap-3 py-2 text-left"
        >
          <span className="text-[15px]">{t("settings.spaceName")}</span>
          <span className="flex min-w-0 items-center gap-1 text-[15px] font-semibold">
            <span className="truncate">{p.name}</span>
            <Icon name="chevronRight" size={18} className="shrink-0 opacity-70" />
          </span>
        </button>

        <ul className="flex flex-col border-t border-current/10 py-2" aria-label={t("insights.members")}>
          {p.members.map((m) => (
            <li key={m.id} className="flex min-h-14 items-center gap-3">
              <Avatar name={m.name} />
              <span className="flex-1 truncate text-[15px] font-semibold">{m.name}</span>
              {m.isMe ? (
                <span className="rounded-full border border-current/25 px-2 py-0.5 text-[12px] font-semibold">{t("settings.you")}</span>
              ) : (
                p.onRemoveMember && (
                  <button
                    type="button"
                    onClick={() => setRemoving(m)}
                    aria-label={t("settings.remove", { name: m.name })}
                    title={t("settings.remove", { name: m.name })}
                    className="inline-flex size-11 items-center justify-center rounded-full border border-current/20"
                  >
                    <Icon name="close" size={18} />
                  </button>
                )
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

        <div className="mb-2 flex flex-col gap-3 rounded-[18px] border border-current/15 p-4">
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Icon name="share" size={18} />
            {t("settings.invite")}
          </p>
          {full ? (
            <p className={`text-[13px] ${muted}`}>{t("settings.inviteFull")}</p>
          ) : p.invite.kind === "fresh" ? (
            <>
              <p className={`text-[13px] leading-relaxed ${muted}`}>{t("settings.inviteBody", { hours: p.inviteHours })}</p>
              <p className="num rounded-[12px] bg-current/6 px-3 py-2 text-[13px] break-all">{p.invite.url}</p>
              <div className="flex flex-wrap gap-2">
                <PrimaryButton
                  tone={tone}
                  icon={copied ? "check" : "copy"}
                  aria-live="polite"
                  onClick={() => {
                    const url = p.invite.kind === "fresh" ? p.invite.url : "";
                    void navigator.clipboard
                      ?.writeText(url)
                      .then(() => setCopied(true))
                      .catch(() => undefined);
                  }}
                >
                  {copied ? t("settings.copied") : t("settings.copyLink")}
                </PrimaryButton>
                {canShare && (
                  <SecondaryButton
                    tone={tone}
                    icon="share"
                    onClick={() => {
                      const url = p.invite.kind === "fresh" ? p.invite.url : "";
                      void navigator.share({ title: "COVOW", url }).catch(() => undefined);
                    }}
                  >
                    {t("settings.share")}
                  </SecondaryButton>
                )}
              </div>
              <p className={`text-[12px] ${muted}`}>{t("settings.newLinkNote")}</p>
            </>
          ) : (
            <>
              <p className={`text-[13px] leading-relaxed ${muted}`}>
                {p.invite.kind === "active"
                  ? t("settings.inviteActive", { date: until(p.invite.expiresAt) })
                  : t("settings.inviteBody", { hours: p.inviteHours })}
              </p>
              <PrimaryButton
                tone={tone}
                icon="plus"
                loading={p.busy}
                onClick={() => {
                  setCopied(false);
                  p.onCreateInvite?.();
                }}
              >
                {p.invite.kind === "active" ? t("settings.newLinkAgain") : t("settings.newLink")}
              </PrimaryButton>
            </>
          )}
          {!full && p.invite.kind !== "none" && p.onRevokeInvite && (
            <button type="button" onClick={p.onRevokeInvite} className="min-h-11 self-start text-[14px] font-semibold underline underline-offset-4">
              {t("settings.cancelLink")}
            </button>
          )}
        </div>

        {p.error && (
          <p role="alert" className="mb-2 flex items-start gap-2 text-[14px] font-medium">
            <Icon name="attention" size={18} className="mt-px shrink-0" />
            {t(p.error)}
          </p>
        )}

        <div className="border-t border-current/10 py-2">
          <SecondaryButton
            tone={tone}
            icon="arrowLeft"
            disabled={alone}
            fullWidth
            aria-describedby={alone ? "leave-note" : undefined}
            onClick={() => setLeaving(true)}
          >
            {t("settings.leave")}
          </SecondaryButton>
          {alone && (
            <p id="leave-note" className={`mt-2 text-center text-[12px] ${muted}`}>
              {t("settings.leaveLast")}
            </p>
          )}
        </div>
      </GlassCard>

      <GlassSheet
        open={renaming}
        onClose={() => setRenaming(false)}
        title={t("settings.spaceName")}
        footer={
          <PrimaryButton
            tone="dark"
            fullWidth
            disabled={draft.trim().length === 0}
            onClick={async () => {
              await p.onRename?.(draft.trim());
              setRenaming(false);
            }}
          >
            {t("common.save")}
          </PrimaryButton>
        }
      >
        <FormField label={t("settings.spaceName")} required>
          {(f) => <TextInput {...f} value={draft} maxLength={LIMITS.spaceName} onChange={(e) => setDraft(e.target.value)} />}
        </FormField>
      </GlassSheet>

      <ConfirmDialog
        open={removing !== null}
        title={t("settings.removeConfirm", { name: removing?.name ?? "" })}
        body={t("settings.removeBody")}
        confirmLabel={t("settings.remove", { name: removing?.name ?? "" })}
        busy={p.busy}
        onConfirm={async () => {
          if (removing) await p.onRemoveMember?.(removing.id);
          setRemoving(null);
        }}
        onCancel={() => setRemoving(null)}
      />

      <ConfirmDialog
        open={leaving}
        title={t("settings.leaveConfirm")}
        body={t("settings.leaveBody")}
        confirmLabel={t("settings.leave")}
        busy={p.busy}
        onConfirm={async () => {
          await p.onLeave?.();
          setLeaving(false);
        }}
        onCancel={() => setLeaving(false)}
      />
    </>
  );
}
