import { serve } from "@hono/node-server";
import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { testApi } from "../fixture";
import { newAccount } from "../../server/model/state";
import { shardCosts } from "../../shared/gacha";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const users = new Map<string, string>();
const api = testApi({
  async verify(value) {
    const uid = users.get(value);
    if (!uid) throw new Error("Unknown test token");
    return uid;
  },
});
setInterval(() => api.advance(1000), 1000).unref();
const auth = new Hono();
auth.use("*", cors());
auth.post("/identitytoolkit.googleapis.com/v1/accounts:signUp", (c) => {
  const uid = `playwright-${randomUUID()}`;
  const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({
    sub: uid,
    user_id: uid,
    iat: now,
    exp: now + 3600,
    auth_time: now,
    firebase: { sign_in_provider: "anonymous" },
  })}.`;
  users.set(token, uid);
  const account = newAccount();
  account.profile.confirmedCoins = 20;
  account.profile.gacha.shards = Object.values(shardCosts).reduce((sum, cost) => sum + cost, 0);
  api.repository.accounts.set(uid, account);
  return c.json({
    localId: uid,
    idToken: token,
    refreshToken: "fixture-refresh",
    expiresIn: "3600",
  });
});
auth.post("/identitytoolkit.googleapis.com/v1/accounts:lookup", async (c) => {
  const body = await c.req.json<{ idToken: string }>();
  const uid = users.get(body.idToken);
  if (!uid) return c.json({ error: { message: "INVALID_ID_TOKEN" } }, 400);
  return c.json({
    users: [{ localId: uid, validSince: String(now), providerUserInfo: [] }],
  });
});
serve({ fetch: auth.fetch, hostname: "127.0.0.1", port: 9099 });
serve({ fetch: api.app.fetch, hostname: "127.0.0.1", port: 8765 });
