import { useState } from "react";
import { LIMITS } from "@shared/schemas";
import {
  type Category,
  categoryUsage,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
  useReorderCategories,
} from "../../api/data";
import { errorKey } from "../../api/space";
import { ConfirmDialog } from "../../components/glass/ConfirmDialog";
import { GlassSheet } from "../../components/glass/GlassSheet";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Buttons";
import { FormField, TextInput } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";

/**
 * カテゴリの追加・名前の変更・並べ替え（上へ／下へ）・削除のシート。
 * 削除の前に、使っている予定・支出の件数を見せて確認する（消すと「未分類」になる）。
 */
function CategorySheet({
  open,
  onClose,
  category,
  all,
}: {
  open: boolean;
  onClose: () => void;
  /** 編集するカテゴリ（null なら追加） */
  category: Category | null;
  all: readonly Category[];
}) {
  const { t } = useT();
  const [name, setName] = useState(category?.name ?? "");
  const [confirm, setConfirm] = useState<{ plans: number; expenses: number } | null>(null);
  const create = useCreateCategory();
  const rename = useRenameCategory();
  const remove = useDeleteCategory();
  const reorder = useReorderCategories();
  const [error, setError] = useState<unknown>(null);
  const index = category ? all.findIndex((c) => c.id === category.id) : -1;
  const pending = create.isPending || rename.isPending || remove.isPending || reorder.isPending;

  const save = () => {
    const v = name.trim();
    if (!v) return;
    setError(null);
    const opts = { onSuccess: onClose, onError: setError };
    if (category) rename.mutate({ id: category.id, name: v }, opts);
    else create.mutate(v, opts);
  };
  const move = (delta: -1 | 1) => {
    const ids = all.map((c) => c.id);
    const j = index + delta;
    if (index < 0 || j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j]!, ids[index]!];
    setError(null);
    reorder.mutate(ids, { onError: setError });
  };

  return (
    <>
      <GlassSheet
        open={open && confirm === null}
        onClose={onClose}
        title={category ? t("category.edit") : t("settings.addCategory")}
        footer={
          <div className="flex flex-col gap-3">
            {error !== null && (
              <p role="alert" className="text-[14px] font-medium text-amber">
                {t(errorKey(error))}
              </p>
            )}
            <PrimaryButton tone="dark" fullWidth loading={create.isPending || rename.isPending} disabled={!name.trim()} onClick={save}>
              {category ? t("common.save") : t("settings.addCategory")}
            </PrimaryButton>
            {category && (
              <SecondaryButton
                tone="dark"
                icon="trash"
                fullWidth
                disabled={pending}
                onClick={async () => {
                  try {
                    setConfirm(await categoryUsage(category.id));
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                {t("plan.delete")}
              </SecondaryButton>
            )}
          </div>
        }
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <FormField label={t("category.name")} required>
            {(f) => <TextInput {...f} value={name} maxLength={LIMITS.categoryName} onChange={(e) => setName(e.target.value)} autoComplete="off" />}
          </FormField>
          {category && all.length > 1 && (
            <div className="flex gap-2">
              <SecondaryButton tone="dark" icon="arrowUp" disabled={index <= 0 || pending} onClick={() => move(-1)}>
                {t("category.moveUp")}
              </SecondaryButton>
              <SecondaryButton tone="dark" icon="arrowDown" disabled={index >= all.length - 1 || pending} onClick={() => move(1)}>
                {t("category.moveDown")}
              </SecondaryButton>
            </div>
          )}
          {/* Enter で送信できるように（見えない・読み上げない送信ボタン） */}
        <button type="submit" hidden />
        </form>
      </GlassSheet>
      <ConfirmDialog
        open={confirm !== null}
        title={t("category.deleteConfirm", { name: category?.name ?? "" })}
        body={confirm ? t("category.deleteBody", { plans: confirm.plans, expenses: confirm.expenses }) : undefined}
        confirmLabel={t("plan.delete")}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!category) return;
          remove.mutate(category.id, {
            onSuccess: () => {
              setConfirm(null);
              onClose();
            },
            onError: (e) => {
              setConfirm(null);
              setError(e);
            },
          });
        }}
      />
    </>
  );
}

export function useCategorySheet(all: readonly Category[]) {
  const [state, setState] = useState<{ open: boolean; id: string | null; key: number }>({ open: false, id: null, key: 0 });
  // 並べ替えたあとも、開いているカテゴリを最新の一覧から引き直す
  const category = state.id ? (all.find((c) => c.id === state.id) ?? null) : null;
  return {
    open: (id: string | null) => setState((s) => ({ open: true, id, key: s.key + 1 })),
    element: (
      <CategorySheet key={`category-${state.key}`} open={state.open} onClose={() => setState((s) => ({ ...s, open: false }))} category={category} all={all} />
    ),
  };
}
