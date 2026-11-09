import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axes } from "../shared/model";
import { demoCandidate } from "../shared/demo";
import { evaluate } from "../shared/evaluation";
import { GeminiRepository } from "../server/repository/gemini";
import { api, healthSchema } from "../extension/core/api";
import { testApi } from "./fixture";

const text = "テストの本文";
const safe = () => demoCandidate(text);

describe("Gemini-only S/Q rewards", () => {
  it.each([
    [0, 2, 1],
    [1, 6, 1.5],
    [2, 10, 1.5],
  ])("uses Q=%i for safe rewards", (Q, xp, coinMultiplier) => {
    const result = evaluate({ ...safe(), appreciation: Q }, text);
    expect(result).toMatchObject({ S: 2, Q, decision: "safe", xp, coinMultiplier });
  });

  it("takes maxima, rather than summing the eight axes", () => {
    expect(
      evaluate({ ...safe(), appreciation: 1, constructiveness: 2, information: 2, humor: 1 }, text),
    ).toMatchObject({ S: 2, Q: 2, xp: 10 });
    expect(evaluate({ ...safe(), personalAttack: 1, harassment: 1 }, text)).toMatchObject({
      S: 1,
      decision: "needs_secondary_check",
      xp: 2,
      coinMultiplier: 1,
    });
  });

  it("gives harmful posts no XP or coins, even if contribution scores are high", () => {
    const candidate = { ...demoCandidate("頭が悪い。"), appreciation: 2, humor: 2 };
    expect(evaluate(candidate, "頭が悪い。")).toMatchObject({
      S: 0,
      Q: 2,
      decision: "harmful",
      xp: 0,
      coinMultiplier: 0,
    });
  });

  it.each([{ safetyConfidence: 7 }, { contextSufficient: false }, { personalAttack: 1 }])(
    "keeps the provisional minimum for uncertain safety: %j",
    (change) => {
      expect(evaluate({ ...safe(), appreciation: 2, ...change }, text)).toMatchObject({
        decision: "needs_secondary_check",
        needsSecondaryCheck: true,
        xp: 2,
        coinMultiplier: 1,
      });
    },
  );

  it.each([
    { target: "unknown" as const },
    { isDirectAttack: false },
    { isQuotation: true },
    { attackEvidence: [] },
    { attackEvidence: ["本文にない根拠"] },
  ])("retains the experiment's review guards for S=0: %j", (change) => {
    expect(evaluate({ ...demoCandidate("頭が悪い。"), ...change }, "頭が悪い。")).toMatchObject({
      S: 0,
      decision: "needs_secondary_check",
      xp: 2,
      coinMultiplier: 1,
    });
  });

  it("validates Gemini output without letting Gemini specify rewards", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(safe()) }] } }],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    try {
      const repository = new GeminiRepository("test-key", "gemini-test");
      expect(await repository.comment({ draft: text })).toEqual(safe());
      const request = JSON.parse(fetcher.mock.calls[0][1].body);
      expect(request.generationConfig.responseJsonSchema.properties.personalAttack.maximum).toBe(2);
      expect(request.generationConfig.responseJsonSchema.properties).not.toHaveProperty("xp");
      expect(request.generationConfig.responseJsonSchema.properties).not.toHaveProperty(
        "coinMultiplier",
      );
      fetcher.mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [
              { content: { parts: [{ text: JSON.stringify({ ...safe(), appreciation: 3 }) }] } },
            ],
          }),
        ),
      );
      await expect(repository.comment({ draft: text })).rejects.toMatchObject({ status: 503 });
      expect(axes.safeParse({ ...safe(), xp: 999 }).success).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("analysis time budgets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Node's native AbortSignal timer does not use the fake clock.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
      return controller.signal;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function delayedJson(value: unknown, ms: number, signal?: AbortSignal | null) {
    return new Promise<Response>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve(Response.json(value));
      }, ms);
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
  }

  function mockGemini(videoMs: number, commentMs: number) {
    const fetcher = vi.fn((_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      const video = body.contents[0].parts.some((part: { fileData?: unknown }) => part.fileData);
      const value = video
        ? { summary: "動画の要約", topics: [], keyClaims: [], sensitiveTopics: [] }
        : safe();
      return delayedJson(
        { candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }] },
        video ? videoMs : commentMs,
        init?.signal,
      );
    });
    vi.stubGlobal("fetch", fetcher);
    return fetcher;
  }

  async function analyzeVideo() {
    const f = testApi({ ai: new GeminiRepository("test-key", "gemini-test") });
    return f.app.request("/v1/analyze", {
      method: "POST",
      headers: { Authorization: "Bearer alice", "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        context: { platform: "youtube", content: { videoId: "9hE5-98ZeCg", title: "動画" } },
      }),
    });
  }

  it("accepts a comment response after the old ten-second limit", async () => {
    mockGemini(0, 12_000);
    const result = new GeminiRepository("test-key", "gemini-test").comment({ draft: text }).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(12_000);
    expect(await result).toEqual({ value: safe() });
  });

  it("aborts a comment still pending at twenty seconds without retrying", async () => {
    const fetcher = mockGemini(0, 21_000);
    const failure = new GeminiRepository("test-key", "gemini-test")
      .comment({ draft: text })
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(await failure).toMatchObject({ status: 503 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("accepts a video and a slower comment within their shared budget", async () => {
    mockGemini(7_000, 17_000);
    const result = analyzeVideo();
    await vi.advanceTimersByTimeAsync(24_000);
    const response = await result;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ videoSource: "gemini_video" });
  });

  it("stops at twenty-five seconds instead of giving the comment a fresh twenty seconds", async () => {
    const fetcher = mockGemini(8_000, 18_000);
    let completed = false;
    const result = analyzeVideo().then((response) => {
      completed = true;
      return response;
    });
    await vi.advanceTimersByTimeAsync(24_999);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect((await result).status).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][1]?.signal?.aborted).toBe(true);
  });

  it("keeps the ten-second video fallback and uses the remaining time for a comment", async () => {
    mockGemini(11_000, 14_000);
    const result = analyzeVideo();
    await vi.advanceTimersByTimeAsync(24_000);
    const response = await result;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ videoSource: "page_metadata" });
  });

  it("lets the extension receive an analysis response after twenty-six seconds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: unknown, init?: RequestInit) =>
        delayedJson({ ok: true, mode: "gemini" }, 26_000, init?.signal),
      ),
    );
    const result = api("/v1/analyze", healthSchema, undefined, {}).then(
      (value) => ({ value }),
      (error: unknown) => ({ error }),
    );
    await vi.advanceTimersByTimeAsync(26_000);
    expect(await result).toEqual({ value: { ok: true, mode: "gemini" } });
  });

  it("ends the extension wait at twenty-eight seconds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: unknown, init?: RequestInit) =>
        delayedJson({ ok: true, mode: "gemini" }, 29_000, init?.signal),
      ),
    );
    let completed = false;
    const result = api("/v1/analyze", healthSchema, undefined, {})
      .catch((error: unknown) => error)
      .finally(() => {
        completed = true;
      });
    await vi.advanceTimersByTimeAsync(27_999);
    expect(completed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toMatchObject({ status: 0 });
  });
});
