import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { testApi } from "../fixture";
import { newAccount } from "../../server/model/state";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const uid = "playwright-fixture-user";
const now = Math.floor(Date.now() / 1000);
const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
  sub: uid,
  user_id: uid,
  iat: now,
  exp: now + 3600,
  auth_time: now,
  firebase: { sign_in_provider: "anonymous" },
})}.`;
const api = testApi({
  async verify(value) {
    if (value !== token) throw new Error("Unknown test token");
    return uid;
  },
});
const account = newAccount();
account.profile.confirmedCoins = 20;
api.repository.accounts.set(uid, account);
setInterval(() => api.advance(1000), 1000).unref();
const auth = new Hono();
auth.use("*", cors());
auth.post("/identitytoolkit.googleapis.com/v1/accounts:signUp", (c) =>
  c.json({
    localId: uid,
    idToken: token,
    refreshToken: "fixture-refresh",
    expiresIn: "3600",
  }),
);
auth.post("/identitytoolkit.googleapis.com/v1/accounts:lookup", (c) =>
  c.json({
    users: [{ localId: uid, validSince: String(now), providerUserInfo: [] }],
  }),
);
serve({ fetch: auth.fetch, hostname: "127.0.0.1", port: 9099 });
serve({ fetch: api.app.fetch, hostname: "127.0.0.1", port: 8765 });
