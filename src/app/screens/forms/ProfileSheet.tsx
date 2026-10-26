import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LIMITS } from "@shared/schemas";
import { useUpdateMe } from "../../api/me";
import { errorKey } from "../../api/space";
import { GlassSheet } from "../../components/glass/GlassSheet";
import { PrimaryButton } from "../../components/ui/Buttons";
import { FormField, TextInput } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";

/** 表示名（メンバーの一覧や予定の「追加した人」に出る名前）を変えるシート */
function ProfileSheet({ open, onClose, current }: { open: boolean; onClose: () => void; current: string }) {
  const { t } = useT();
  const qc = useQueryClient();
  const [name, setName] = useState(current);
  const update = useUpdateMe();

  const save = () => {
    const v = name.trim();
    if (!v) return;
    update.mutate(
      { displayName: v },
      {
        onSuccess: () => {
          // メンバーの一覧や「追加した人」にも新しい名前を出す
          for (const key of ["space", "plans", "summary", "expenses", "insights"]) void qc.invalidateQueries({ queryKey: [key] });
          onClose();
        },
      },
    );
  };

  return (
    <GlassSheet
      open={open}
      onClose={onClose}
      title={t("settings.displayName")}
      footer={
        <div className="flex flex-col gap-3">
          {update.isError && (
            <p role="alert" className="text-[14px] font-medium text-amber">
              {t(errorKey(update.error))}
            </p>
          )}
          <PrimaryButton tone="dark" fullWidth loading={update.isPending} disabled={!name.trim() || name.trim() === current} onClick={save}>
            {t("common.save")}
          </PrimaryButton>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <FormField label={t("settings.displayName")} required>
          {(f) => <TextInput {...f} value={name} maxLength={LIMITS.displayName} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />}
        </FormField>
        {/* Enter で送信できるように（見えない・読み上げない送信ボタン） */}
        <button type="submit" hidden />
      </form>
    </GlassSheet>
  );
}

export function useProfileSheet(current: string) {
  const [state, setState] = useState({ open: false, key: 0 });
  return {
    open: () => setState((s) => ({ open: true, key: s.key + 1 })),
    element: (
      <ProfileSheet key={`profile-${state.key}`} open={state.open} onClose={() => setState((s) => ({ ...s, open: false }))} current={current} />
    ),
  };
}
