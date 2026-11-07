import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  appearance,
  asStarProfile,
  defaultEquipment,
  newProfile,
  profile,
  starterItems,
} from "../shared/game";
import { gachaPool } from "../shared/gacha";
import { inventoryVersion, newAccount } from "../server/model/state";
import { testApi } from "./fixture";

describe("earned wardrobe", () => {
  it("starts with basic equipment and keeps all gacha rewards out of the starter set", () => {
    const pet = newProfile();
    expect(pet.characterType).toBe("f");
    expect(pet.name).toBe("ほしもち");
    expect(pet).toMatchObject({
      empathy: 10,
      criticalThinking: 10,
      resilience: 10,
      gacha: { shards: 0 },
    });
    expect(pet.unlockedItems).toContain("skin_base");
    expect(pet.unlockedItems).toContain("head_none");
    expect(pet.unlockedItems).toContain("prop_none");
    expect(gachaPool.length).toBeGreaterThan(0);
    expect(gachaPool.some((id) => pet.unlockedItems.includes(id))).toBe(false);
    expect(pet.unlockedItems).not.toContain("skin_star_galaxy");
    expect(pet.unlockedItems).not.toContain("skin_star_pixel");
  });

  it("keeps legacy character data readable and unchanged while presenting only Hoshimoti", async () => {
    const f = testApi();
    const legacy = newAccount();
    legacy.profile.characterType = "b";
    legacy.profile.name = "まえの子";
    legacy.profile.confirmedCoins = 42;
    legacy.profile.level = 5;
    legacy.profile.unlockedItems.push("skin_midnight", "hat_heart");
    legacy.profile.equippedItems = { ...defaultEquipment, skin: "skin_midnight", hat: "hat_heart" };
    const original = structuredClone(legacy);
    f.repository.accounts.set("alice", legacy);
    const saved = profile.parse(await f.game.profile("alice"));
    expect(saved).toEqual(original.profile);
    const shown = asStarProfile(saved);
    expect(shown.characterType).toBe("f");
    expect(shown.equippedItems).toEqual(defaultEquipment);
    expect(shown).toMatchObject({ name: "まえの子", confirmedCoins: 42, level: 5 });
    expect(shown.unlockedItems).toEqual(saved.unlockedItems);
    expect(f.repository.accounts.get("alice")).toEqual(original);
    expect(
      appearance.safeParse({
        name: saved.name,
        characterType: "b",
        equippedItems: saved.equippedItems,
      }).success,
    ).toBe(false);
    expect(
      appearance.safeParse({
        name: shown.name,
        characterType: "f",
        equippedItems: shown.equippedItems,
      }).success,
    ).toBe(true);
    await f.game.appearance("alice", {
      name: shown.name,
      characterType: "f",
      equippedItems: shown.equippedItems,
    });
    const archived = {
      name: saved.name,
      characterType: saved.characterType,
      equippedItems: saved.equippedItems,
    };
    expect(f.repository.accounts.get("alice")?.legacyAppearance).toEqual(archived);
    await f.game.appearance("alice", {
      name: "新しいなまえ",
      characterType: "f",
      equippedItems: shown.equippedItems,
    });
    expect(f.repository.accounts.get("alice")?.legacyAppearance).toEqual(archived);
  });

  it("rejects unowned gear on the API, then lets the owner equip an actual draw", async () => {
    const f = testApi();
    const account = newAccount();
    account.profile.confirmedCoins = 20;
    f.repository.accounts.set("alice", account);
    const equip = (items: typeof account.profile.equippedItems) =>
      f.app.request("/v1/profile/appearance", {
        method: "PATCH",
        headers: { Authorization: "Bearer alice", "Content-Type": "application/json" },
        body: JSON.stringify({ name: "ほしもち", characterType: "f", equippedItems: items }),
      });
    expect((await equip({ ...defaultEquipment, skin: "skin_star_galaxy" })).status).toBe(400);
    const draw = await f.game.draw("alice", randomUUID());
    expect(draw.duplicate).toBe(false);
    const owner = await f.game.profile("alice");
    expect(owner.unlockedItems.filter((id) => gachaPool.includes(id))).toEqual([draw.itemId]);
    const { ITEM_CATALOG } = await import("../shared/game");
    const response = await equip({
      ...defaultEquipment,
      [ITEM_CATALOG[draw.itemId].slot]: draw.itemId,
    });
    expect(response.status).toBe(200);
    expect((await f.game.profile("alice")).equippedItems[ITEM_CATALOG[draw.itemId].slot]).toBe(
      draw.itemId,
    );
  });

  it("migrates old blanket grants once, retaining paid draws, shards and growth rewards", async () => {
    const f = testApi();
    const legacy = newAccount();
    legacy.inventoryVersion = 0;
    Object.assign(legacy.profile, { level: 3, xp: 12, confirmedCoins: 35 });
    legacy.profile.characterType = "f";
    legacy.profile.unlockedItems = [
      ...starterItems,
      "skin_star_galaxy",
      "skin_star_pixel",
      "skin_star_mint",
      "hat_star_beret",
      "eyes_glimmer",
      "skin_sunset",
    ];
    legacy.profile.equippedItems = {
      ...defaultEquipment,
      skin: "skin_star_galaxy",
      hat: "hat_star_beret",
      eyes: "eyes_glimmer",
    };
    legacy.profile.gacha.draws = 2;
    legacy.profile.gacha.shards = { skin_star_mint: 1 };
    f.repository.accounts.set("alice", legacy);
    const requestId = randomUUID();
    f.repository.draws.set("alice/" + requestId, {
      requestId,
      itemId: "hat_star_beret",
      rarity: "R",
      duplicate: true,
    });
    const otherId = randomUUID();
    f.repository.draws.set("bob/" + otherId, {
      requestId: otherId,
      itemId: "skin_star_galaxy",
      rarity: "UR",
      duplicate: false,
    });
    const pet = await f.game.profile("alice");
    expect(pet.unlockedItems).not.toContain("skin_star_galaxy");
    expect(pet.unlockedItems).not.toContain("skin_star_pixel");
    expect(pet.unlockedItems).not.toContain("eyes_glimmer");
    expect(pet.unlockedItems).toEqual(
      expect.arrayContaining(["hat_star_beret", "skin_star_mint", "skin_sunset"]),
    );
    expect(pet.equippedItems).toMatchObject({
      skin: "skin_base",
      eyes: "eyes_default",
      hat: "hat_star_beret",
    });
    expect(pet).toMatchObject({
      level: 3,
      xp: 12,
      confirmedCoins: 35,
      gacha: { draws: 2, shards: 1 },
    });
    expect(f.repository.accounts.get("alice")?.inventoryVersion).toBe(inventoryVersion);
    expect(await f.game.profile("alice")).toEqual(pet);
  });
});
