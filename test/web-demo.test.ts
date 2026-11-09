import { describe, expect, it } from "vitest";
import { DemoStore } from "../web/model";
import { classify } from "../shared/classification";
import { demoCandidate } from "../shared/demo";
import { dailyExchangeShop } from "../server/service/exchange-shop";
import { displayRarity, shardCosts, type ExchangeResult, type GachaResult } from "../shared/gacha";
import { newProfile } from "../shared/game";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
describe("isolated web experience", () => {
  it("awards a confirmed demo post once, unlocks level items, and persists only demo data", () => {
    const disk = storage();
    const store = new DemoStore(disk);
    const text = "参考になりました。ありがとうございます！";
    const result = classify(demoCandidate(text), text);
    expect(store.post(result, "one")).toBe(true);
    expect(store.post(result, "one")).toBe(false);
    const pet = store.getSnapshot().profile;
    expect(pet.level).toBe(2);
    expect(pet.totalPosts).toBe(1);
    expect(pet.unlockedItems).toContain("skin_level_sunrise");
    expect(new DemoStore(disk).getSnapshot().profile).toEqual(pet);
    expect(newProfile().confirmedCoins).toBe(0);
    expect(JSON.stringify(store.getSnapshot())).not.toContain(text);
  });
  it("recovers the same draw without spending again and converts duplicate rarity to shards", async () => {
    const store = new DemoStore(storage(), () => 0);
    const first = (await store.dispatch({ type: "gacha" })) as GachaResult;
    expect(await store.dispatch({ type: "gacha" })).toEqual(first);
    expect(store.getSnapshot().profile.confirmedCoins).toBe(20);
    await store.dispatch({ type: "gachaAck", requestId: first.requestId });
    const second = (await store.dispatch({ type: "gacha" })) as GachaResult;
    expect(second.duplicate).toBe(true);
    expect(second.shardsAwarded).toBe(1);
    expect(store.getSnapshot().profile.confirmedCoins).toBe(10);
    expect(store.getSnapshot().profile.gacha.shards).toBe(21);
  });
  it("uses the same daily shop order as the server and excludes owned/exclusive items", async () => {
    const store = new DemoStore(storage());
    const now = Date.parse("2026-11-09T23:58:00+09:00");
    expect(await store.shop(now)).toEqual(
      dailyExchangeShop(now, store.getSnapshot().profile.unlockedItems),
    );
  });
  it("recovers an exchange, spends once, and fills the slot with an unowned item", async () => {
    const store = new DemoStore(storage());
    const before = await store.shop();
    const itemId = before.items[0];
    const requestId = crypto.randomUUID();
    const input = { type: "exchange", selection: { itemId, day: before.day }, requestId } as const;
    const result = (await store.dispatch(input)) as ExchangeResult;
    expect(result.cost).toBe(shardCosts[displayRarity[itemId] ?? "N"]);
    expect(await store.dispatch(input)).toEqual(result);
    expect(store.getSnapshot().profile.gacha.shards).toBe(20 - result.cost);
    expect((await store.shop()).items).not.toContain(itemId);
    expect((await store.shop()).items).toHaveLength(6);
  });
  it("rejects unowned equipment and remains usable when browser storage is unavailable", () => {
    const store = new DemoStore({
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    });
    const pet = store.getSnapshot().profile;
    expect(() =>
      store.saveAppearance({
        name: "ほし",
        characterType: "f",
        equippedItems: { ...pet.equippedItems, skin: "skin_star_galaxy" },
      }),
    ).toThrow();
    store.saveAppearance({ name: "ほし", characterType: "f", equippedItems: pet.equippedItems });
    expect(store.getSnapshot().profile.name).toBe("ほし");
    expect(store.storageAvailable).toBe(false);
    store.reset();
    expect(store.getSnapshot().profile.level).toBe(1);
  });
});
