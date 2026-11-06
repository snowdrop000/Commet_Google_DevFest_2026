import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { analyzeResponse, coinBalance, settlementResult } from "../shared/model";
import { profile } from "../shared/game";
import { ServiceError } from "../server/model/state";
import { fakeAi, testApi } from "./fixture";

const path = {
  analyze: "/v1/analyze",
  profile: "/v1/profile",
  tick: "/v1/coins/tick",
  prepare: "/v1/coins/prepare",
  settle: "/v1/coins/settle",
};

function fixture(options?: Parameters<typeof testApi>[0]) {
  const test = testApi(options);
  async function call(
    route: string,
    body?: unknown,
    token = "alice",
    method = body ? "POST" : "GET",
  ) {
    return test.app.request(route, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function collect(sessionId: string, count: number) {
    await call(path.tick, { sessionId, active: true });
    for (let i = 0; i < count; i++) {
      test.advance(15_000);
      const response = await call(path.tick, { sessionId, active: true });
      expect(coinBalance.parse(await response.json()).pending).toBe(i + 1);
    }
  }
  return { ...test, call, collect };
}

describe("Hono API", () => {
  it("requires verified authentication and validates requests without echoing the body", async () => {
    const f = fixture();
    expect((await f.app.request(path.profile)).status).toBe(401);
    expect((await f.call(path.profile, undefined, "fake-token")).status).toBe(401);
    const invalid = await f.call(path.analyze, { text: "テスト本文", fake: true });
    expect(invalid.status).toBe(400);
    expect(await invalid.text()).not.toContain("テスト本文");
  });

  it("returns a six-axis preview with no profile or receipt writes", async () => {
    const f = fixture();
    const response = await f.call(path.analyze, {
      text: "頭が悪い。",
      context: { platform: "x", reply: { isReply: true } },
    });
    const result = analyzeResponse.parse(await response.json());
    expect(result).toMatchObject({
      analysis: { category: "context_required", suggestion: "" },
      analysisId: null,
    });
    expect(f.repository.accounts.size).toBe(0);
    expect(f.repository.sessions.size).toBe(0);
  });

  it("limits bursts independently by authenticated UID", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-06T01:00:00Z"), toFake: ["Date"] });
    try {
      const f = fixture();
      for (let index = 0; index < 90; index++)
        expect((await f.call(path.profile)).status).toBe(200);
      const blocked = await f.call(path.profile);
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).toBe("60");
      expect((await f.call(path.profile, undefined, "bob")).status).toBe(200);
      vi.setSystemTime(new Date("2026-11-06T01:01:00Z"));
      expect((await f.call(path.profile)).status).toBe(200);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ["説明が分かりにくいです。", 1.5, 30],
    ["頭が悪い。動画を出すな。", 0, 0],
  ] as const)(
    "uses server-side classification to settle %s only once",
    async (text, multiplier, awarded) => {
      const f = fixture();
      const sessionId = randomUUID();
      await f.collect(sessionId, 20);
      await f.call(path.prepare, { sessionId });
      const analysis = analyzeResponse.parse(
        await (await f.call(path.analyze, { text, sessionId })).json(),
      );
      const outcome = { kind: "posted", analysisId: analysis.analysisId };
      const results = await Promise.all(
        Array.from({ length: 4 }, async () =>
          settlementResult.parse(await (await f.call(path.settle, { sessionId, outcome })).json()),
        ),
      );
      expect(
        results.every((entry) => entry.awarded === awarded && entry.multiplier === multiplier),
      ).toBe(true);
      expect(
        settlementResult.parse(
          await (await f.call(path.settle, { sessionId, outcome: { kind: "closed" } })).json(),
        ),
      ).toEqual(results[0]);
      const owner = profile.parse(await (await f.call(path.profile)).json());
      expect(owner).toMatchObject({ confirmedCoins: awarded, totalPosts: 1 });
      expect(
        profile.parse(await (await f.call(path.profile, undefined, "bob")).json()).confirmedCoins,
      ).toBe(0);
      expect(JSON.stringify([...f.repository.sessions.values()])).not.toContain(text);
    },
  );

  it("settles an unposted session at 1.0x and holds a prepared session closed without proof", async () => {
    const f = fixture();
    const sessionId = randomUUID(),
      attempted = randomUUID();
    await f.collect(sessionId, 2);
    const closed = { kind: "closed" };
    expect(
      settlementResult.parse(
        await (await f.call(path.settle, { sessionId, outcome: closed })).json(),
      ),
    ).toMatchObject({ multiplier: 1, awarded: 2 });
    await f.collect(attempted, 1);
    await f.call(path.prepare, { sessionId: attempted });
    expect(
      settlementResult.parse(
        await (await f.call(path.settle, { sessionId: attempted, outcome: closed })).json(),
      ),
    ).toMatchObject({ status: "held", pending: 1, awarded: 0 });
  });

  it("deduplicates a concurrent check, caches videos and enforces the Gemini budget", async () => {
    const ai = fakeAi();
    const comment = vi.spyOn(ai, "comment");
    const video = vi.spyOn(ai, "video");
    const reserve = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValue(false);
    const f = fixture({ ai, quota: { reserve } });
    const context = { platform: "youtube", content: { videoId: "9hE5-98ZeCg", title: "題名" } };
    const input = { text: "応援しています！", context };
    const responses = await Promise.all([f.call(path.analyze, input), f.call(path.analyze, input)]);
    expect(analyzeResponse.parse(await responses[0].json()).videoSource).toBe("gemini_video");
    expect(responses[1].status).toBe(200);
    expect((await f.call(path.analyze, { ...input, text: "丁寧な動画でした。" })).status).toBe(200);
    expect((await f.call(path.analyze, { ...input, text: "次も見ます。" })).status).toBe(429);
    expect(comment).toHaveBeenCalledTimes(2);
    expect(video).toHaveBeenCalledTimes(1);
  });

  it("falls back to metadata on a video failure and rejects unowned equipment", async () => {
    const ai = fakeAi();
    const video = vi.spyOn(ai, "video").mockRejectedValue(new ServiceError(503, "unavailable"));
    const f = fixture({ ai });
    const result = await f.call(path.analyze, {
      text: "改善点は具体例です。",
      context: { platform: "youtube", content: { videoId: "9hE5-98ZeCg", title: "動画" } },
    });
    expect(analyzeResponse.parse(await result.json()).videoSource).toBe("page_metadata");
    const another = await f.call(path.analyze, {
      text: "具体例を足すと伝わりやすいと思います。",
      context: { platform: "youtube", content: { videoId: "9hE5-98ZeCg", title: "動画" } },
    });
    expect(analyzeResponse.parse(await another.json()).videoSource).toBe("page_metadata");
    expect(video).toHaveBeenCalledTimes(1);
    const payload = {
      name: "ココロ",
      characterType: "b",
      equippedItems: { skin: "skin_aurora", hat: "hat_none", badge: "badge_none" },
    };
    expect((await f.call("/v1/profile/appearance", payload, "alice", "PATCH")).status).toBe(400);
  });
});
