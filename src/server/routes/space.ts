import { Hono } from "hono";
import { spaceInputSchema } from "../../shared/schemas";
import { parseBody, repoErrorResponse } from "../http";
import { currentSpaceId, requireMember } from "../middleware/require-member";
import { currentUser, requireAuth } from "../middleware/session";
import {
  acceptInvite,
  createInvite,
  createSpace,
  getActiveInvite,
  getSpace,
  leaveSpace,
  peekInvite,
  removeMember,
  renameSpace,
  revokeInvites,
} from "../repo/space";
import type { AppEnv } from "../types";

const inviteUrl = (origin: string, token: string) => `${origin}/invite/${token}`;

/** スペース（作る・見る・名前を変える・メンバーを外す・抜ける・招待リンク） */
export const spaceRoutes = new Hono<AppEnv>()
  // スペースを作る。どこにも入っていない人だけ（入っていれば 409 ALREADY_IN_SPACE）
  .post("/", requireAuth(), async (c) => {
    const user = currentUser(c);
    const parsed = await parseBody(c, spaceInputSchema);
    if (!parsed.ok) return parsed.res;
    try {
      const space = await createSpace(c.var.db, { userId: user.id, name: parsed.data.name, locale: user.locale });
      return c.json({ space }, 201);
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  })
  .use("*", requireMember())
  .get("/", async (c) => {
    const user = currentUser(c);
    const space = await getSpace(c.var.db, currentSpaceId(c));
    return c.json({ ...space, members: space.members.map((m) => ({ ...m, isMe: m.id === user.id })) });
  })
  .patch("/", async (c) => {
    const parsed = await parseBody(c, spaceInputSchema);
    if (!parsed.ok) return parsed.res;
    await renameSpace(c.var.db, currentSpaceId(c), parsed.data.name);
    return c.json({ name: parsed.data.name });
  })
  .delete("/members/:userId", async (c) => {
    try {
      await removeMember(c.var.db, currentSpaceId(c), currentUser(c).id, c.req.param("userId"));
      return c.body(null, 204);
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  })
  .post("/leave", async (c) => {
    try {
      await leaveSpace(c.var.db, currentSpaceId(c), currentUser(c).id);
      return c.body(null, 204);
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  })
  // 招待リンクを発行（前のリンクは取り消す）。リンクの URL はこの応答でだけ返す
  .post("/invite", async (c) => {
    try {
      const { token, expiresAt } = await createInvite(c.var.db, currentSpaceId(c), currentUser(c).id);
      return c.json({ url: inviteUrl(c.env.APP_ORIGIN, token), expiresAt }, 201);
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  })
  // 有効なリンクがあるかと期限（URL は返さない。必要なら作り直す）
  .get("/invite", async (c) => {
    const invite = await getActiveInvite(c.var.db, currentSpaceId(c));
    return c.json({ active: invite ? { expiresAt: invite.expiresAt } : null });
  })
  .delete("/invite", async (c) => {
    await revokeInvites(c.var.db, currentSpaceId(c));
    return c.body(null, 204);
  });

/** 招待リンクを開いた人向け（中身の確認はログイン前でもできる。参加はログインが必要） */
export const inviteRoutes = new Hono<AppEnv>()
  .get("/:token", async (c) => {
    try {
      const invite = await peekInvite(c.var.db, c.req.param("token"));
      return c.json({
        status: invite.status,
        spaceName: invite.spaceName,
        inviterName: invite.inviterName,
        expiresAt: invite.expiresAt,
      });
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  })
  .post("/:token/accept", requireAuth(), async (c) => {
    try {
      const space = await acceptInvite(c.var.db, c.req.param("token"), currentUser(c).id);
      return c.json({ space });
    } catch (e) {
      return repoErrorResponse(c, e);
    }
  });
