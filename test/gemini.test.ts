import { afterEach, describe, expect, it, vi } from "vitest";
import { demoCandidate } from "../shared/demo";
import { GeminiRepository } from "../server/repository/gemini";
import { VertexGeminiRepository } from "../server/repository/vertex";

const candidate = demoCandidate("ありがとうございます。");
const answer = (value: unknown) =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [
              { text: "private model thought", thought: true },
              { text: JSON.stringify(value) },
            ],
          },
        },
      ],
    }),
    { status: 200 },
  );

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("Gemini connections", () => {
  it("bounds generated video prose without dropping the video context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        answer({
          summary: "あ".repeat(900),
          topics: Array.from({ length: 8 }, () => "話題".repeat(100)),
          keyClaims: ["主張".repeat(100)],
          sensitiveTopics: [],
        }),
      ),
    );
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "test-token",
    });
    const result = await repository.video("PF630-XnjiE");
    expect(result.summary).toHaveLength(700);
    expect(result.summary.endsWith("…")).toBe(true);
    expect(result.topics).toHaveLength(6);
    expect(result.topics.every((item) => item.length <= 160)).toBe(true);
    expect(result.keyClaims[0]).toHaveLength(160);
  });

  it("still rejects malformed video structures and unexpected fields", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const summary = { summary: "動画の要約", topics: [], keyClaims: [], sensitiveTopics: [] };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(answer({ ...summary, topics: [123] }))
      .mockResolvedValueOnce(answer({ ...summary, unexpected: "private data" }));
    vi.stubGlobal("fetch", fetch);
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "test-token",
    });
    for (let index = 0; index < 2; index++) {
      await expect(repository.video("PF630-XnjiE")).rejects.toMatchObject({ status: 503 });
    }
  });

  it("allows a 35-second comment judgment to finish", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(answer(candidate)), 35_000);
            init.signal?.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                reject(init.signal?.reason);
              },
              { once: true },
            );
          }),
      ),
    );
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "test-token",
    });
    const completed = expect(
      repository.comment({ draft: "ありがとうございます。" }),
    ).resolves.toEqual(candidate);
    await vi.advanceTimersByTimeAsync(35_000);
    await completed;
  });

  it("still aborts a comment that never finishes and logs no input", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
              once: true,
            });
          }),
      ),
    );
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "private-test-token",
    });
    const completed = expect(
      repository.comment({ draft: "private test draft" }),
    ).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(61_000);
    await completed;
    const event = JSON.parse(warn.mock.calls[0][0]);
    expect(event).toMatchObject({ operation: "comment", reason: "timeout" });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private");
  });

  it("allows a 70-second video summary to finish instead of falling back after ten seconds", async () => {
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((ms) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), ms);
      return controller.signal;
    });
    const summary = { summary: "長い動画の要約", topics: [], keyClaims: [], sensitiveTopics: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, init: RequestInit) =>
          new Promise((resolve, reject) => {
            const timer = setTimeout(() => resolve(answer(summary)), 70_000);
            init.signal?.addEventListener(
              "abort",
              () => {
                clearTimeout(timer);
                reject(init.signal?.reason);
              },
              { once: true },
            );
          }),
      ),
    );
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "test-token",
    });
    const result = repository.video("PF630-XnjiE");
    const completed = expect(result).resolves.toEqual(summary);
    await vi.advanceTimersByTimeAsync(70_000);
    await completed;
  });

  it("uses Vertex project billing and refreshed bearer credentials for comments and videos", async () => {
    const summary = { summary: "短い動画の要約", topics: [], keyClaims: [], sensitiveTopics: [] };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(answer(candidate))
      .mockResolvedValueOnce(answer(summary));
    vi.stubGlobal("fetch", fetch);
    const getAccessToken = vi
      .fn()
      .mockResolvedValueOnce("first-token")
      .mockResolvedValueOnce("refreshed-token");
    const repository = new VertexGeminiRepository(
      "real-project",
      "global",
      "gemini-3.5-flash-lite",
      { getAccessToken },
    );
    expect(await repository.comment({ draft: "ありがとうございます。" })).toEqual(candidate);
    expect(await repository.video("jNQXAC9IVRw")).toEqual(summary);
    expect(getAccessToken).toHaveBeenCalledTimes(2);
    for (const [index, token] of ["first-token", "refreshed-token"].entries()) {
      const [url, init] = fetch.mock.calls[index];
      expect(url).toBe(
        "https://aiplatform.googleapis.com/v1/projects/real-project/locations/global/publishers/google/models/gemini-3.5-flash-lite:generateContent",
      );
      expect(init.headers).toMatchObject({
        Authorization: `Bearer ${token}`,
        "x-goog-user-project": "real-project",
      });
      expect(init.headers).not.toHaveProperty("x-goog-api-key");
      expect(JSON.stringify(init.body)).not.toContain(token);
      expect(init.signal).toBeInstanceOf(AbortSignal);
      const body = JSON.parse(init.body);
      expect(body.generationConfig.responseMimeType).toBe("application/json");
      expect(body.generationConfig.responseJsonSchema).not.toHaveProperty("$schema");
    }
    const video = JSON.parse(fetch.mock.calls[1][1].body);
    expect(video.contents[0].parts[0]).toEqual({
      fileData: { fileUri: "https://www.youtube.com/watch?v=jNQXAC9IVRw", mimeType: "video/mp4" },
      videoMetadata: { fps: 0.2 },
    });
    expect(video.contents[0].parts[0].videoMetadata).not.toHaveProperty("startOffset");
    expect(video.contents[0].parts[0].videoMetadata).not.toHaveProperty("endOffset");
  });

  it("uses the selected regional endpoint when a regional model is configured", async () => {
    const fetch = vi.fn().mockResolvedValue(answer(candidate));
    vi.stubGlobal("fetch", fetch);
    const repository = new VertexGeminiRepository("real-project", "us-central1", "gemini-test", {
      getAccessToken: async () => "token",
    });
    await repository.comment({ draft: "感謝しています。" });
    expect(fetch.mock.calls[0][0]).toContain(
      "https://us-central1-aiplatform.googleapis.com/v1/projects/real-project/locations/us-central1/",
    );
  });

  it("keeps the existing Developer API key connection available", async () => {
    const fetch = vi.fn().mockResolvedValue(answer(candidate));
    vi.stubGlobal("fetch", fetch);
    const repository = new GeminiRepository("secret-key", "gemini-test");
    expect(await repository.comment({ draft: "感謝しています。" })).toEqual(candidate);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
    );
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ "x-goog-api-key": "secret-key" });
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("Authorization");
  });

  it("does not send requests with missing credentials or reveal authentication failures", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    for (const getAccessToken of [
      async () => null,
      async () => {
        throw new Error("private credential details");
      },
    ]) {
      const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
        getAccessToken,
      });
      await expect(repository.comment({ draft: "感謝しています。" })).rejects.toMatchObject({
        status: 503,
        message: "Geminiの判定を取得できませんでした。",
      });
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(JSON.stringify(warn.mock.calls)).not.toContain("private credential details");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"stage":"authentication"'));
  });

  it("rejects provider errors and invalid model output without leaking the response", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("private provider details", { status: 403 }))
      .mockResolvedValueOnce(answer({ invalid: true }));
    vi.stubGlobal("fetch", fetch);
    const repository = new VertexGeminiRepository("real-project", "global", "gemini-test", {
      getAccessToken: async () => "token",
    });
    for (let index = 0; index < 2; index++) {
      await expect(repository.comment({ draft: "感謝しています。" })).rejects.toMatchObject({
        status: 503,
        message: "Geminiの判定を取得できませんでした。",
      });
    }
  });

  it.each([
    ["demo-commet", "global", "gemini-test"],
    ["real-project", "https://wrong-host", "gemini-test"],
    ["real-project", "global", "gemini-test/../other"],
  ])(
    "rejects invalid Vertex configuration before requesting credentials",
    (project, location, model) => {
      expect(() => new VertexGeminiRepository(project, location, model)).toThrow();
    },
  );
});
