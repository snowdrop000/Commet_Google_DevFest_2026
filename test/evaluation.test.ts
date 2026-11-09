import { describe, expect, it, vi } from "vitest";
import { axes } from "../shared/model";
import { demoCandidate } from "../shared/demo";
import { evaluate } from "../shared/evaluation";
import { GeminiRepository } from "../server/repository/gemini";

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
