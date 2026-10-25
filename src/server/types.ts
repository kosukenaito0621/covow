import type { Db } from "./db/client";
import type { SessionUser } from "./auth/session";

export type AppEnv = {
  Bindings: Env;
  Variables: {
    db: Db;
    /** ログイン中なら本人（session ミドルウェアが入れる） */
    user: SessionUser | null;
    sessionId: string | null;
  };
};

