import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * 変更系（POST / PATCH / PUT / DELETE）は、自分のサイトの画面から来たものだけ受け付ける（CSRF 対策）。
 * ブラウザは別サイトからの送信に、その別サイトの Origin を付けるので、APP_ORIGIN と比べれば見分けられる。
 */
export const originCheck = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!SAFE.has(c.req.method) && c.req.header("Origin") !== c.env.APP_ORIGIN) {
      return c.json({ code: "FORBIDDEN_ORIGIN", message: "この操作は受け付けられません" }, 403);
    }
    await next();
  });
