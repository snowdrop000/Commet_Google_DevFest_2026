import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newProfile, statKeys, xpNeeded } from "../shared/game";
import { demoCandidate } from "../shared/demo";
import { classify } from "../server/service/analysis";
import { applyGrowth } from "../server/service/growth";
import {
  accountState,
  explorationSession,
  growthEvidence,
  migrateGrowth,
  newAccount,
} from "../server/model/state";
import { testApi } from "./fixture";

const now = Date.parse("2026-11-08T00:00:00Z");
const evidence = (change: Partial<ReturnType<typeof demoCandidate>> = {}) =>
  growthEvidence.parse(classify({ ...demoCandidate("本文です。"), ...change }, "本文です。"));

describe("posting streaks", () => {
  it("counts midnight in Japan as a new day and does not increment again at UTC midnight", () => {
    const pet = newProfile();
    const post = evidence();
    applyGrowth(pet, post, Date.parse("2026-11-08T23:59:00+09:00"));
    expect(pet).toMatchObject({ streak: 1, lastActiveDate: "2026-11-08", totalPosts: 1 });
    applyGrowth(pet, post, Date.parse("2026-11-09T00:01:00+09:00"));
    expect(pet).toMatchObject({ streak: 2, lastActiveDate: "2026-11-09", totalPosts: 2 });
    applyGrowth(pet, post, Date.parse("2026-11-09T09:01:00+09:00"));
    expect(pet).toMatchObject({ streak: 2, lastActiveDate: "2026-11-09", totalPosts: 3 });
  });

  it("starts again at one after a day without a confirmed post", () => {
    const pet = newProfile();
    const post = evidence();
    applyGrowth(pet, post, Date.parse("2026-11-08T23:59:00+09:00"));
    applyGrowth(pet, post, Date.parse("2026-11-09T00:01:00+09:00"));
    applyGrowth(pet, post, Date.parse("2026-11-11T00:01:00+09:00"));
    expect(pet).toMatchObject({ streak: 1, lastActiveDate: "2026-11-11", totalPosts: 3 });
  });

  it("shows an expired streak as zero without writing or resetting the saved profile", async () => {
    const f = testApi(); // November 6, 10:00 in Japan.
    const account = newAccount();
    Object.assign(account.profile, {
      streak: 2,
      lastActiveDate: "2026-11-05",
      totalPosts: 14,
      confirmedCoins: 92,
    });
    const original = structuredClone(account);
    f.repository.accounts.set("alice", account);
    const read = async () => {
      const response = await f.app.request("/v1/profile", {
        headers: { Authorization: "Bearer alice" },
      });
      expect(response.status).toBe(200);
      return response.json();
    };
    expect(await read()).toMatchObject({ streak: 2, totalPosts: 14, confirmedCoins: 92 });
    f.advance(14 * 3_600_000); // November 7, 00:00 in Japan.
    expect(await read()).toEqual({ ...original.profile, streak: 0 });
    expect(f.repository.accounts.get("alice")).toEqual(original);
  });
});

describe("level-only ability growth", () => {
  it("uses 98 level-ups and 1,862 XP, with steps at each decade", () => {
    expect([1, 9, 10, 19, 20, 90, 98].map(xpNeeded)).toEqual([10, 10, 12, 12, 14, 28, 28]);
    expect(Array.from({ length: 98 }, (_, i) => xpNeeded(i + 1)).reduce((a, b) => a + b, 0)).toBe(
      1862,
    );
  });

  it("stores contribution history on a post without directly increasing abilities", () => {
    const pet = newProfile();
    applyGrowth(pet, evidence({ appreciation: 1 }), now);
    expect(pet).toMatchObject({
      level: 1,
      xp: 6,
      empathy: 10,
      criticalThinking: 10,
      resilience: 10,
    });
    expect(pet.growth.contributions.appreciation).toBe(1);
    applyGrowth(pet, evidence({ appreciation: 1 }), now);
    expect(pet).toMatchObject({
      level: 2,
      xp: 2,
      empathy: 15,
      criticalThinking: 12,
      resilience: 12,
    });
    expect(pet.growth.tendencies.empathy).toBe(2);
  });

  it("takes wisdom's maximum separately on each confirmed post", () => {
    const pet = newProfile();
    applyGrowth(pet, evidence({ constructiveness: 2, information: 1 }), now);
    applyGrowth(pet, evidence({ constructiveness: 0, information: 2 }), now);
    expect(pet.growth.contributions).toMatchObject({ constructiveness: 2, information: 3 });
    expect(pet.growth.tendencies.criticalThinking).toBe(4);
  });

  it("does not count uncertain or harmful contribution scores in the growth profile", () => {
    const pet = newProfile();
    applyGrowth(pet, evidence({ appreciation: 2, safetyConfidence: 7 }), now);
    expect(pet).toMatchObject({
      level: 1,
      xp: 2,
      empathy: 10,
      criticalThinking: 10,
      resilience: 10,
    });
    expect(pet.growth).toEqual(newProfile().growth);
    applyGrowth(
      pet,
      growthEvidence.parse(classify(demoCandidate("頭が悪い。"), "頭が悪い。")),
      now,
    );
    expect(pet.xp).toBe(2);
    expect(pet.growth).toEqual(newProfile().growth);
  });

  it("grows by the base amount when there is no contribution history", () => {
    const pet = newProfile();
    for (let i = 0; i < 5; i++) applyGrowth(pet, evidence(), now);
    expect(pet).toMatchObject({
      level: 2,
      xp: 0,
      empathy: 12,
      criticalThinking: 12,
      resilience: 12,
    });
  });

  it("carries rounding fairly across levels while keeping abilities integral", () => {
    const pet = newProfile();
    const twoKinds = evidence({ appreciation: 2, humor: 2 });
    for (let i = 0; i < 40; i++) {
      applyGrowth(pet, twoKinds, now);
      expect(Math.abs(pet.empathy - pet.resilience)).toBeLessThanOrEqual(1);
      for (const key of statKeys) expect(Number.isInteger(pet[key])).toBe(true);
    }
  });

  it("reaches level 99 near the ability cap and stops accumulating XP", () => {
    const pet = newProfile();
    const balanced = evidence({ appreciation: 2, constructiveness: 2, humor: 2 });
    for (let i = 0; i < 187; i++) applyGrowth(pet, balanced, now);
    expect(pet).toMatchObject({
      level: 99,
      xp: 0,
      empathy: 300,
      criticalThinking: 300,
      resilience: 300,
    });
    applyGrowth(pet, balanced, now);
    expect(pet).toMatchObject({
      level: 99,
      xp: 0,
      empathy: 300,
      criticalThinking: 300,
      resilience: 300,
    });
  });
});

describe("growth reset and confirmed settlement", () => {
  it.each([0, 3])(
    "resets growth once, preserving appearance, equipment, items and balances at inventory version %i",
    async (version) => {
      const f = testApi();
      const old = newAccount();
      old.growthVersion = 0;
      old.inventoryVersion = version;
      Object.assign(old.profile, {
        name: "相方のキャラ",
        characterType: "b",
        level: 50,
        xp: 100,
        empathy: 81,
        criticalThinking: 62,
        resilience: 23,
        confirmedCoins: 123,
      });
      old.profile.unlockedItems.push("skin_midnight", "hat_heart", "skin_level_sunrise");
      old.profile.equippedItems.skin = "skin_midnight";
      old.profile.gacha = { draws: 20, sinceSR: 2, sinceUR: 7, shards: { skin_midnight: 9 } };
      const original = structuredClone(old);
      f.repository.accounts.set("alice", old);
      const pets = await Promise.all(Array.from({ length: 4 }, () => f.game.profile("alice")));
      const expected = {
        ...original.profile,
        level: 1,
        xp: 0,
        empathy: 10,
        criticalThinking: 10,
        resilience: 10,
        growth: newProfile().growth,
      };
      for (const pet of pets) expect(pet).toEqual(expected);
      const migrated = f.repository.accounts.get("alice")!;
      expect(migrated.growthVersion).toBe(1);
      migrated.profile.level = 2;
      expect((await f.game.profile("alice")).level).toBe(2);
      expect(migrateGrowth(migrated)).toBe(migrated);
      const raw = structuredClone(original) as Record<string, unknown>;
      delete raw.growthVersion;
      expect(accountState.parse(raw).growthVersion).toBe(0);
    },
  );

  it("uses the final checked evaluation and settles concurrent retries only once", async () => {
    const f = testApi();
    const sessionId = randomUUID();
    await f.game.tick("alice", sessionId, true);
    for (let i = 0; i < 20; i++) {
      f.advance(15_000);
      await f.game.tick("alice", sessionId, true);
    }
    await f.game.preparePost("alice", sessionId);
    const good = classify(demoCandidate("応援しています！"), "応援しています！");
    const bad = classify(demoCandidate("頭が悪い。"), "頭が悪い。");
    const first = await f.game.issueReceipt("alice", sessionId, good);
    await f.game.issueReceipt("alice", sessionId, good);
    const last = await f.game.issueReceipt("alice", sessionId, bad);
    expect(last).not.toBe(first);
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        f.game.settle("alice", {
          sessionId,
          outcome: { kind: "posted", analysisId: last },
        }),
      ),
    );
    for (const result of results) expect(result).toMatchObject({ multiplier: 0, awarded: 0 });
    const pet = await f.game.profile("alice");
    expect(pet).toMatchObject({ level: 1, xp: 0, totalPosts: 1, confirmedCoins: 0 });
    expect(pet.growth).toEqual(newProfile().growth);
  });

  it.each([
    [0, 9, 2, 1, 20],
    [1, 9, 6, 1.5, 30],
    [2, 9, 10, 1.5, 30],
    [2, 7, 2, 1, 20],
  ])(
    "keeps XP and coin rewards consistent: Q=%i confidence=%i",
    async (Q, safetyConfidence, xp, multiplier, awarded) => {
      const f = testApi();
      const sessionId = randomUUID();
      await f.game.tick("alice", sessionId, true);
      for (let i = 0; i < 20; i++) {
        f.advance(15_000);
        await f.game.tick("alice", sessionId, true);
      }
      await f.game.preparePost("alice", sessionId);
      const result = classify(
        { ...demoCandidate("本文です。"), appreciation: Q, safetyConfidence },
        "本文です。",
      );
      const analysisId = await f.game.issueReceipt("alice", sessionId, result);
      expect(
        await f.game.settle("alice", { sessionId, outcome: { kind: "posted", analysisId } }),
      ).toMatchObject({ status: "settled", multiplier, awarded });
      const pet = await f.game.profile("alice");
      expect(pet.confirmedCoins).toBe(awarded);
      expect(pet.level === 2 ? pet.xp + xpNeeded(1) : pet.xp).toBe(xp);
      const stored = JSON.stringify([...f.repository.sessions.values()]);
      expect(stored).not.toContain("本文です。");
    },
  );

  it("ignores old evaluation receipts rather than giving them provisional rewards", () => {
    const session = explorationSession.parse({
      pending: 20,
      lastTickAt: null,
      postPending: true,
      receipt: {
        id: randomUUID(),
        evidence: { category: "supportive", confidence: 9 },
        expiresAt: now,
      },
      result: null,
    });
    expect(session.receipt?.evidence).toBeNull();
  });
});
