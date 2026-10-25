import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type { MessageKey } from "@shared/i18n";
import { api, ApiError } from "./client";
import { meQuery } from "./me";

export interface SpaceMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  joinedAt: string;
  isMe: boolean;
}

export interface Space {
  id: string;
  name: string;
  maxMembers: number;
  members: SpaceMember[];
}

export const spaceQuery = queryOptions({ queryKey: ["space"], queryFn: () => api<Space>("/space") });
export const inviteQuery = queryOptions({
  queryKey: ["space", "invite"],
  queryFn: () => api<{ active: { expiresAt: string } | null }>("/space/invite"),
});

export type InvitePeek = {
  status: "valid" | "expired" | "used" | "revoked" | "full";
  spaceName: string;
  inviterName: string;
  expiresAt: string;
};

/** 招待リンクの中身。存在しないリンクは null */
export const invitePeekQuery = (token: string) =>
  queryOptions({
    queryKey: ["invite", token],
    queryFn: async (): Promise<InvitePeek | null> => {
      try {
        return await api<InvitePeek>(`/invites/${encodeURIComponent(token)}`);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null;
        throw e;
      }
    },
    retry: false,
  });

/**
 * スペースが変わったら、本人の情報（所属）とスペースの情報を取り直す。
 * 画面に出ていない情報も取り直す（refetchType: "all"）。画面の移動の前の確認が、古い「所属なし」を使わないようにするため
 */
function useRefreshSpace() {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: meQuery.queryKey, refetchType: "all" }),
      qc.invalidateQueries({ queryKey: ["space"], refetchType: "all" }),
    ]);
  };
}

export function useCreateSpace() {
  const refresh = useRefreshSpace();
  return useMutation({ mutationFn: (name: string) => api("/space", { method: "POST", body: { name } }), onSuccess: refresh });
}

export function useRenameSpace() {
  const refresh = useRefreshSpace();
  return useMutation({ mutationFn: (name: string) => api("/space", { method: "PATCH", body: { name } }), onSuccess: refresh });
}

export function useRemoveMember() {
  const refresh = useRefreshSpace();
  return useMutation({
    mutationFn: (userId: string) => api(`/space/members/${encodeURIComponent(userId)}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

/** スペースから抜ける。抜けたあとは画面を移ってから forgetSpaceData で前のスペースのデータを捨てる */
export function useLeaveSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/space/leave", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: meQuery.queryKey, refetchType: "all" }),
  });
}

/** 前のスペースのデータが画面に残らないよう、本人の情報以外の取ってきたものを捨てる */
export const forgetSpaceData = (qc: ReturnType<typeof useQueryClient>) =>
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ url: string; expiresAt: string }>("/space/invite", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteQuery.queryKey }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api("/space/invite", { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: inviteQuery.queryKey }),
  });
}

export function useAcceptInvite(token: string) {
  const refresh = useRefreshSpace();
  return useMutation({
    mutationFn: () => api(`/invites/${encodeURIComponent(token)}/accept`, { method: "POST" }),
    onSuccess: refresh,
  });
}

const CODE_MESSAGES: Partial<Record<string, MessageKey>> = {
  ALREADY_IN_SPACE: "invite.alreadyInSpace",
  SPACE_FULL: "invite.full",
  LAST_MEMBER: "error.LAST_MEMBER",
  CANNOT_REMOVE_SELF: "error.CANNOT_REMOVE_SELF",
  NOT_FOUND: "error.NOT_FOUND",
  INVITE_NOT_FOUND: "invite.notFound",
  INVITE_EXPIRED: "invite.expired",
  INVITE_USED: "invite.used",
  INVITE_REVOKED: "invite.revoked",
  VALIDATION: "error.validation",
  ALREADY_PURCHASED: "error.ALREADY_PURCHASED",
  STATE_CONFLICT: "error.STATE_CONFLICT",
  FROM_PLAN: "expense.fromPlanNote",
  CATEGORY_EXISTS: "error.CATEGORY_EXISTS",
  INVALID_REFERENCE: "error.INVALID_REFERENCE",
  TRIAL_LOCKED: "error.TRIAL_LOCKED",
  TRIAL_LIMIT: "trial.limit",
};

/** API のエラーを、言語に合わせた文の鍵にする */
export const errorKey = (e: unknown): MessageKey =>
  (e instanceof ApiError && CODE_MESSAGES[e.code]) || "error.generic";
