import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newProfile, defaultEquipment, xpNeeded } from "../shared/game";
import { demoCandidate } from "../shared/demo";
import { exchangePool, gachaPool } from "../shared/gacha";
import { levelRewards, levelTitle, withLevelRewards, xpUntilLevel } from "../shared/progression";
import { classify } from "../server/service/analysis";
import { growthEvidence, newAccount, newSession } from "../server/model/state";
import { testApi } from "./fixture";

describe("level progression", () => {
  it("grants the first reward on a confirmed level-up exactly once across retries", async () => {
    const f = testApi();
    const account = newAccount();
    account.profile.xp = 8;
    f.repository.accounts.set("alice", account);
    const sessionId = randomUUID(),
      analysisId = randomUUID();
    f.repository.sessions.set(`alice/${sessionId}`, {
      ...newSession(),
      postPending: true,
      receipt: {
        id: analysisId,
        expiresAt: Date.parse("2026-11-07T00:00:00Z"),
        evidence: growthEvidence.parse(
          classify(demoCandidate("今日の動画です。"), "今日の動画です。"),
        ),
      },
    });
    await Promise.all(
      Array.from({ length: 4 }, () =>
        f.game.settle("alice", {
          sessionId,
          outcome: { kind: "posted", analysisId },
        }),
      ),
    );
    const pet = await f.game.profile("alice");
    expect(pet).toMatchObject({ level: 2, xp: 0, totalPosts: 1, mood: "levelup" });
    expect(pet.unlockedItems.filter((id) => id === "skin_level_sunrise")).toHaveLength(1);
    expect(pet.unlockedItems).not.toContain("hat_level_ribbon");
  });

  it("does not unlock equipment from a preview or an unconfirmed post", async () => {
    const f = testApi();
    const account = newAccount();
    account.profile.xp = 9;
    f.repository.accounts.set("alice", account);
    const preview = await f.app.request("/v1/analyze", {
      method: "POST",
      headers: { Authorization: "Bearer alice", "Content-Type": "application/json" },
      body: JSON.stringify({ text: "応援しています！" }),
    });
    expect(preview.status).toBe(200);
    await f.game.settle("alice", { sessionId: randomUUID(), outcome: { kind: "closed" } });
    expect(await f.game.profile("alice")).toEqual(account.profile);
  });

  it("backfills earned equipment concurrently without changing existing progress, balances or legacy data", async () => {
    const f = testApi();
    const account = newAccount();
    Object.assign(account.profile, {
      level: 20,
      xp: 17,
      empathy: 42,
      criticalThinking: 63,
      resilience: 7,
      confirmedCoins: 31,
      totalPosts: 134,
    });
    account.profile.gacha = { draws: 9, sinceSR: 1, sinceUR: 3, shards: 13 };
    account.profile.unlockedItems.push("skin_star_galaxy");
    account.legacyAppearance = {
      name: "以前の子",
      characterType: "a",
      equippedItems: { ...defaultEquipment },
    };
    const original = structuredClone(account);
    f.repository.accounts.set("alice", account);
    const results = await Promise.all(Array.from({ length: 4 }, () => f.game.profile("alice")));
    expect(results.every((pet) => JSON.stringify(pet) === JSON.stringify(results[0]))).toBe(true);
    expect(results[0]).toEqual({
      ...original.profile,
      unlockedItems: [...original.profile.unlockedItems, ...levelRewards.map((r) => r.itemId)],
    });
    expect(new Set(results[0].unlockedItems).size).toBe(results[0].unlockedItems.length);
    expect(f.repository.accounts.get("alice")).toEqual({ ...original, profile: results[0] });
    expect(await f.game.profile("alice")).toEqual(results[0]);
  });

  it("rejects locked equipment and allows earned equipment even before a profile refresh", async () => {
    const f = testApi();
    const value = {
      name: "ほしもち",
      characterType: "f" as const,
      equippedItems: { ...defaultEquipment, skin: "skin_level_sunrise" },
    };
    await expect(f.game.appearance("alice", value)).rejects.toMatchObject({ status: 400 });
    const account = newAccount();
    account.profile.level = 2;
    f.repository.accounts.set("alice", account);
    await f.game.appearance("alice", value);
    expect((await f.game.profile("alice")).equippedItems.skin).toBe("skin_level_sunrise");
    value.equippedItems.skin = "skin_level_moonlight";
    await expect(f.game.appearance("alice", value)).rejects.toMatchObject({ status: 400 });
  });

  it("keeps level rewards out of paid draws, daily exchanges and the starter wardrobe", () => {
    const fresh = newProfile();
    for (const { itemId } of levelRewards) {
      expect(gachaPool).not.toContain(itemId);
      expect(exchangePool).not.toContain(itemId);
      expect(fresh.unlockedItems).not.toContain(itemId);
    }
    expect(levelRewards).toHaveLength(7);
    expect(gachaPool).toContain("skin_star_galaxy");
    expect(exchangePool).not.toContain("skin_star_galaxy");
    expect(withLevelRewards(fresh)).toBe(fresh);
    expect(levelTitle(1)).toBe("はじまりのほし");
    expect(levelTitle(9)).toBe("ほしの旅人");
    expect(levelTitle(99)).toBe("ほしの伝説");
    expect(xpUntilLevel({ level: 1, xp: 9 }, 2)).toBe(1);
    expect(xpUntilLevel({ level: 2, xp: 9 }, 5)).toBe(xpNeeded(2) + xpNeeded(3) + xpNeeded(4) - 9);
    expect(xpUntilLevel({ level: 99, xp: 30 }, 99)).toBe(0);
  });
});
