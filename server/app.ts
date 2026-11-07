import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { appearance } from "../shared/game";
import { exchangeRequest, gachaRequest } from "../shared/gacha";
import { analyzeRequest, coinTick, settlement } from "../shared/model";
import { ServiceError } from "./model/state";
import type { AnalysisService } from "./service/analysis";
import type { GameService } from "./service/game";

type VerifyToken = (token: string) => Promise<string>;
const session = z.strictObject({ sessionId: z.uuid() });

async function readJson<T>(request: { json: () => Promise<unknown> }, schema: z.ZodType<T>) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ServiceError(400, "リクエストの形式を確認してください。");
  return parsed.data;
}

export function createApp(
  game: GameService,
  analysis: AnalysisService,
  verifyToken: VerifyToken,
  mode: "gemini" | "emulator-demo" | "unconfigured",
) {
  const app = new Hono<{ Variables: { uid: string } }>();
  const requests = new Map<string, number>();
  let minute = Math.floor(Date.now() / 60_000);
  app.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });
  app.get("/health", (c) => c.json({ ok: true, mode }));
  app.use("/v1/*", async (c, next) => {
    const header = c.req.header("Authorization");
    const token = header?.match(/^Bearer ([^\s]{1,8192})$/)?.[1];
    if (!token) return c.json({ error: "ログインが必要です。" }, 401);
    try {
      c.set("uid", await verifyToken(token));
    } catch {
      return c.json({ error: "認証情報を確認できませんでした。" }, 401);
    }
    const currentMinute = Math.floor(Date.now() / 60_000);
    if (currentMinute !== minute) {
      requests.clear();
      minute = currentMinute;
    }
    const count = requests.get(c.var.uid) ?? 0;
    if (count >= 90 || (!count && requests.size >= 4096)) {
      c.header("Retry-After", String(60 - (Math.floor(Date.now() / 1000) % 60)));
      return c.json({ error: "リクエストが集中しています。少し待ってから試してください。" }, 429);
    }
    requests.set(c.var.uid, count + 1);
    await next();
  });
  app.use(
    "/v1/*",
    bodyLimit({ maxSize: 32_768, onError: (c) => c.json({ error: "入力が長すぎます。" }, 413) }),
  );
  app.get("/v1/profile", async (c) => c.json(await game.profile(c.var.uid)));
  app.post("/v1/gacha/draw", async (c) => {
    const { requestId } = await readJson(c.req, gachaRequest);
    return c.json(await game.draw(c.var.uid, requestId));
  });
  app.post("/v1/gacha/exchange", async (c) =>
    c.json(await game.exchange(c.var.uid, await readJson(c.req, exchangeRequest))),
  );
  app.get("/v1/gacha/exchange-shop", async (c) => c.json(await game.exchangeShop(c.var.uid)));
  app.patch("/v1/profile/appearance", async (c) =>
    c.json(await game.appearance(c.var.uid, await readJson(c.req, appearance))),
  );
  app.post("/v1/analyze", async (c) =>
    c.json(await analysis.analyze(c.var.uid, await readJson(c.req, analyzeRequest))),
  );
  app.post("/v1/coins/tick", async (c) => {
    const { sessionId, active } = await readJson(c.req, coinTick);
    return c.json(await game.tick(c.var.uid, sessionId, active));
  });
  app.post("/v1/coins/prepare", async (c) => {
    const { sessionId } = await readJson(c.req, session);
    return c.json(await game.preparePost(c.var.uid, sessionId));
  });
  app.post("/v1/coins/settle", async (c) =>
    c.json(await game.settle(c.var.uid, await readJson(c.req, settlement))),
  );
  app.onError((error, c) => {
    if (error instanceof ServiceError) return c.json({ error: error.message }, error.status);
    console.error(
      JSON.stringify({ event: "request_error", method: c.req.method, type: error.name }),
    );
    return c.json({ error: "サーバーで処理できませんでした。" }, 500);
  });
  return app;
}
