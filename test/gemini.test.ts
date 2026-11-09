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

afterEach(() => vi.unstubAllGlobals());

describe("Gemini connections", () => {
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
      "gemini-3.1-flash-lite",
      { getAccessToken },
    );
    expect(await repository.comment({ draft: "ありがとうございます。" })).toEqual(candidate);
    expect(await repository.video("jNQXAC9IVRw")).toEqual(summary);
    expect(getAccessToken).toHaveBeenCalledTimes(2);
    for (const [index, token] of ["first-token", "refreshed-token"].entries()) {
      const [url, init] = fetch.mock.calls[index];
      expect(url).toBe(
        "https://aiplatform.googleapis.com/v1/projects/real-project/locations/global/publishers/google/models/gemini-3.1-flash-lite:generateContent",
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
    });
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
