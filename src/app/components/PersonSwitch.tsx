import { useQuery } from "@tanstack/react-query";
import { meQuery } from "../api/me";
import { spaceQuery } from "../api/space";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import { TabChips } from "./glass/TabChips";

/** 見ている人（URL の ?user=）。省いたら自分。ログイン中の人の ID も返す */
export function useViewUser(user: string | undefined): { me: string; view: string; isMe: boolean } {
  const me = useQuery(meQuery).data?.user.id ?? "";
  const view = user ?? me;
  return { me, view, isMe: view === me };
}

/**
 * ホーム・分析の「だれの数字を見るか」（自分／相手…）。メンバーが1人なら出さない。
 * 選ぶと onChange に人の ID（自分なら undefined）を返す。
 */
export function PersonSwitch({ value, onChange }: { value: string; onChange: (user: string | undefined) => void }) {
  const { t } = useT();
  const { theme } = useTheme();
  const me = useQuery(meQuery).data?.user.id ?? "";
  const members = useQuery(spaceQuery).data?.members ?? [];
  if (members.length < 2) return null;
  return (
    <TabChips
      label={t("person.view")}
      tone={theme.tone.page}
      value={value}
      onChange={(id) => onChange(id === me ? undefined : id)}
      options={members.map((m) => ({ value: m.id, label: m.id === me ? t("payer.me") : m.displayName }))}
    />
  );
}
