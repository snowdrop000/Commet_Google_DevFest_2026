import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { analyzeRequest } from "../shared/model";
import type { AnalysisService } from "./service/analysis";

/** The shared review account can analyze text, but cannot access real profiles or rewards. */
export function webDemoRoutes(
  analysis: AnalysisService,
  verify: (token: string) => Promise<string>,
) {
  const routes = new Hono<{ Variables: { uid: string } }>();
  let minute = 0,
    requests = 0;
  routes.use("*", async (c, next) => {
    c.header("Cache-Control", "no-store");
    const token = c.req.header("Authorization")?.match(/^Bearer ([^\s]{1,8192})$/)?.[1];
    if (!token) return c.json({ error: "ログインが必要です。" }, 401);
    try {
      c.set("uid", await verify(token));
    } catch {
      return c.json({ error: "審査用アカウントでログインしてください。" }, 401);
    }
    const now = Math.floor(Date.now() / 60_000);
    if (now !== minute) {
      minute = now;
      requests = 0;
    }
    if (++requests > 90) {
      c.header("Retry-After", "60");
      return c.json({ error: "リクエストが集中しています。少し待ってからお試しください。" }, 429);
    }
    await next();
  });
  routes.use(
    "*",
    bodyLimit({ maxSize: 32_768, onError: (c) => c.json({ error: "入力が長すぎます。" }, 413) }),
  );
  routes.post("/analyze", async (c) => {
    const parsed = analyzeRequest
      .omit({ sessionId: true })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return c.json({ error: "リクエストの形式を確認してください。" }, 400);
    return c.json(await analysis.analyze(c.var.uid, parsed.data));
  });
  return routes;
}
