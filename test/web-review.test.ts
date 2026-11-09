import { describe, expect, it, vi } from "vitest";
import { webDemoRoutes } from "../server/web-demo";
import { testApi } from "./fixture";
import { demoCandidate } from "../shared/demo";

function fixture(allowed = true) {
  const quota = { reserve: vi.fn(async () => allowed) };
  const comment = vi.fn(async () => demoCandidate("ありがとうございます。"));
  const context = testApi({
    quota,
    ai: {
      comment,
      video: async () => {
        throw new Error("not used");
      },
    },
  });
  context.app.route(
    "/web-demo",
    webDemoRoutes(context.analysis, async (token) => {
      if (token !== "review-token") throw new Error();
      return "review-user";
    }),
  );
  const post = (data: unknown, token = "review-token") =>
    context.app.request("/web-demo/analyze", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  return { ...context, quota, comment, post };
}
describe("shared review account analysis", () => {
  it("requires a review identity and cannot authorize the normal account API", async () => {
    const f = fixture();
    expect((await f.app.request("/web-demo/analyze", { method: "POST", body: "{}" })).status).toBe(
      401,
    );
    expect((await f.post({ text: "ありがとうございます。" }, "wrong")).status).toBe(401);
    expect(
      (await f.app.request("/v1/profile", { headers: { Authorization: "Bearer review-token" } }))
        .status,
    ).toBe(401);
    expect(f.comment).not.toHaveBeenCalled();
  });
  it("uses real analysis and the shared quota, without issuing receipts or saving profiles", async () => {
    const f = fixture();
    const result = await f.post({ text: "ありがとうございます。", context: { platform: "x" } });
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ demo: false, analysisId: null });
    expect(f.quota.reserve).toHaveBeenCalledWith("review-user", expect.any(String));
    expect(f.repository.accounts.size).toBe(0);
    expect(f.repository.sessions.size).toBe(0);
  });
  it("rejects attempts to create reward receipts or oversized prompts", async () => {
    const f = fixture();
    expect(
      (await f.post({ text: "ありがとうございます。", sessionId: crypto.randomUUID() })).status,
    ).toBe(400);
    expect((await f.post({ text: "a".repeat(33_000) })).status).toBe(413);
    expect(f.comment).not.toHaveBeenCalled();
  });
  it("keeps the Gemini daily cap for the shared review account", async () => {
    const f = fixture(false);
    expect((await f.post({ text: "ありがとうございます。" })).status).toBe(429);
    expect(f.comment).not.toHaveBeenCalled();
  });
});
