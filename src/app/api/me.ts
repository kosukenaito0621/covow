import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Locale } from "@shared/i18n";
import type { ThemeId } from "@shared/theme";
import { api, ApiError } from "./client";

export interface Me {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    locale: Locale;
    theme: ThemeId;
    /** 体験版の仮のアカウントか（guestExpiresAt で消える） */
    isGuest: boolean;
    guestExpiresAt: string | null;
  };
  space: { id: string; name: string } | null;
}

/** ログイン中の本人。ログインしていなければ null（エラーにしない） */
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    try {
      return await api<Me>("/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  staleTime: 5 * 60_000,
});

export type MePatch = Partial<Pick<Me["user"], "displayName" | "locale" | "theme">>;

export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: MePatch) => api<{ user: Me["user"] }>("/me", { method: "PATCH", body: patch }),
    onSuccess: ({ user }) => qc.setQueryData<Me | null>(meQuery.queryKey, (old) => (old ? { ...old, user } : old)),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      // 前の人のデータが画面に残らないよう、取ってきたものを全部捨てる
      qc.clear();
      qc.setQueryData(meQuery.queryKey, null);
    },
  });
}

/** Google ログインを始める URL。ログイン前の言語とテーマも渡し、はじめての人のアカウントに引き継ぐ */
export const googleLoginUrl = (next: string, locale: Locale, theme: ThemeId) =>
  `/api/auth/google?${new URLSearchParams({ next, lang: locale, theme })}`;

/** 体験版を始める（24時間の仮のアカウントと見本のスペース）。ログインの Cookie はサーバーが付ける */
export function useStartTrial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: { lang: Locale; theme: ThemeId }) => api<{ expiresAt: string }>("/trial", { method: "POST", body: prefs }),
    onSuccess: () => qc.invalidateQueries({ queryKey: meQuery.queryKey, refetchType: "all" }),
  });
}
