import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newAccount, inventoryVersion } from "../server/model/state";
import { dailyExchangeShop } from "../server/service/exchange-shop";
import { GameService } from "../server/service/game";
import { ITEM_CATALOG, defaultEquipment } from "../shared/game";
import {
  displayRarity,
  duplicateShardRewards,
  exchangePool,
  exchangeResult,
  gachaOnlyItems,
  gachaPool,
  shardCosts,
  type Rarity,
} from "../shared/gacha";
import { testApi } from "./fixture";

describe("daily shard exchange", () => {
  it("keeps six offers stable until JST midnight and excludes all gacha exclusives", () => {
    const before = Date.parse("2026-11-06T14:59:59.999Z");
    const today = dailyExchangeShop(before);
    expect(today.day).toBe("2026-11-06");
    expect(today.refreshAt).toBe(before + 1);
    expect(today.items).toEqual(dailyExchangeShop(before - 12 * 3_600_000).items);
    expect(new Set(today.items).size).toBe(6);
    expect(today.items.filter((id) => ITEM_CATALOG[id].slot === "skin")).toHaveLength(2);
    expect(today.items.filter((id) => ITEM_CATALOG[id].slot === "hat")).toHaveLength(2);
    expect(today.items.every((id) => exchangePool.includes(id))).toBe(true);
    expect(today.items.some((id) => gachaOnlyItems.includes(id))).toBe(false);
    const tomorrow = dailyExchangeShop(before + 1);
    expect(tomorrow.day).toBe("2026-11-07");
    expect(tomorrow.items).not.toEqual(today.items);
    expect(tomorrow.refreshAt).toBe(today.refreshAt + 86_400_000);
  });

  it.each([
    ["N", 0, 1],
    ["R", 70, 3],
    ["SR", 94, 5],
    ["UR", 99, 8],
  ] as const)(
    "grants %s duplicates the correct common shards and replays without adding again",
    async (rarity, roll, amount) => {
      const f = testApi();
      const account = newAccount();
      account.profile.unlockedItems.push(...gachaPool);
      account.profile.confirmedCoins = 20;
      account.profile.gacha.shards = 2;
      f.repository.accounts.set("alice", account);
      let calls = 0;
      const game = new GameService(f.repository, Date.now, () => (calls++ % 2 === 0 ? roll : 0));
      const requestId = randomUUID();
      const receipt = await game.draw("alice", requestId);
      expect(receipt.duplicate).toBe(true);
      expect(receipt.rarity).toBe(rarity);
      expect(receipt.shardsAwarded).toBe(amount);
      expect(duplicateShardRewards[rarity]).toBe(amount);
      expect((await f.game.profile("alice")).gacha.shards).toBe(2 + amount);
      expect(await game.draw("alice", requestId)).toEqual(receipt);
      const pet = await f.game.profile("alice");
      expect(pet.gacha.shards).toBe(2 + amount);
      expect(pet.confirmedCoins).toBe(10);
    },
  );

  it("excludes ownership before selection and fills category shortages from other unowned items", () => {
    const now = Date.parse("2026-11-07T01:00:00Z");
    const original = dailyExchangeShop(now).items;
    const owned = [
      ...new Set([...original, ...exchangePool.filter((id) => ITEM_CATALOG[id].slot === "skin")]),
    ];
    const shop = dailyExchangeShop(now, owned);
    expect(shop.items).toHaveLength(6);
    expect(new Set(shop.items).size).toBe(6);
    expect(shop.items.every((id) => !owned.includes(id) && exchangePool.includes(id))).toBe(true);
    expect(shop.items).toEqual(dailyExchangeShop(now, [...owned].reverse()).items);
    const last = exchangePool.filter((id) => ITEM_CATALOG[id].slot !== "skin").slice(0, 4);
    const almostAll = exchangePool.filter((id) => !last.includes(id));
    expect(new Set(dailyExchangeShop(now, almostAll).items)).toEqual(new Set(last));
    expect(dailyExchangeShop(now, exchangePool).items).toEqual([]);
  });

  it("returns the authenticated owner's candidates and replenishes after a purchase", async () => {
    const f = testApi();
    const account = newAccount();
    const baseline = dailyExchangeShop(Date.parse("2026-11-06T01:00:00Z")).items;
    account.profile.unlockedItems.push(...baseline);
    account.profile.gacha.shards = 100;
    f.repository.accounts.set("alice", account);
    const list = async (uid: string) => {
      const response = await f.app.request("/v1/gacha/exchange-shop", {
        headers: { Authorization: "Bearer " + uid },
      });
      expect(response.status).toBe(200);
      return (await response.json()) as { day: string; items: string[] };
    };
    const shop = await list("alice");
    expect(shop.items).toHaveLength(6);
    expect(shop.items.some((id) => baseline.includes(id))).toBe(false);
    expect((await list("bob")).items).toEqual(baseline);
    expect((await list("alice")).items).toEqual(shop.items);
    const request = { requestId: randomUUID(), day: shop.day, itemId: shop.items[0] };
    const receipt = await f.game.exchange("alice", request);
    const next = await list("alice");
    expect(next.items).toHaveLength(6);
    expect(next.items).not.toContain(receipt.itemId);
    expect(next.items.some((id) => !shop.items.includes(id))).toBe(true);
    expect(await f.game.exchange("alice", request)).toEqual(receipt);
    expect((await f.game.profile("alice")).gacha.shards).toBe(100 - receipt.cost);
  });

  it("grants the exact displayed item and charges the server's cost at every rarity", async () => {
    const f = testApi();
    const account = newAccount();
    let remaining = Object.values(shardCosts).reduce((sum, cost) => sum + cost, 0);
    account.profile.gacha.shards = remaining;
    account.profile.confirmedCoins = 23;
    f.repository.accounts.set("alice", account);
    for (const rarity of Object.keys(shardCosts) as Rarity[]) {
      let shop = await f.game.exchangeShop("alice");
      for (
        let days = 0;
        days < 90 && !shop.items.some((id) => (displayRarity[id] ?? "N") === rarity);
        days++
      ) {
        f.advance(86_400_000);
        shop = await f.game.exchangeShop("alice");
      }
      const itemId = shop.items.find((id) => (displayRarity[id] ?? "N") === rarity);
      expect(itemId).toBeDefined();
      const receipt = exchangeResult.parse(
        await f.game.exchange("alice", {
          requestId: randomUUID(),
          itemId: itemId!,
          day: shop.day,
        }),
      );
      expect(receipt).toMatchObject({
        itemId,
        rarity,
        cost: shardCosts[rarity],
        day: shop.day,
        duplicate: false,
      });
      const pet = await f.game.profile("alice");
      remaining -= shardCosts[rarity];
      expect(pet.gacha.shards).toBe(remaining);
      expect(pet.unlockedItems).toContain(itemId);
      expect(pet.confirmedCoins).toBe(23);
      expect(pet.gacha.draws).toBe(0);
      expect(pet.equippedItems).toEqual(defaultEquipment);
    }
  });

  it("replays receipts after midnight, rejects altered selections and isolates users", async () => {
    const f = testApi();
    const account = newAccount();
    account.profile.gacha.shards = 20;
    f.repository.accounts.set("alice", account);
    const shop = await f.game.exchangeShop("alice");
    const request = { requestId: randomUUID(), itemId: shop.items[0], day: shop.day };
    const receipts = await Promise.all(
      Array.from({ length: 4 }, () => f.game.exchange("alice", request)),
    );
    for (const receipt of receipts) expect(receipt).toEqual(receipts[0]);
    f.advance(86_400_000);
    expect(await f.game.exchange("alice", request)).toEqual(receipts[0]);
    const pet = await f.game.profile("alice");
    expect(pet.gacha.shards).toBe(20 - receipts[0].cost);
    expect(pet.unlockedItems.filter((id) => gachaPool.includes(id))).toEqual([request.itemId]);
    await expect(f.game.exchange("alice", { ...request, itemId: shop.items[1] })).rejects.toThrow(
      "異なります",
    );
    await expect(f.game.exchange("bob", request)).rejects.toThrow("日付が変わりました");
    expect(f.repository.exchanges.size).toBe(1);
  });

  it("uses one common wallet across concurrent purchases of different items", async () => {
    const f = testApi();
    const account = newAccount();
    const shop = await f.game.exchangeShop("alice");
    const items = shop.items.slice(0, 2);
    const balance = Math.max(...items.map((id) => shardCosts[displayRarity[id] ?? "N"]));
    account.profile.gacha.shards = balance;
    f.repository.accounts.set("alice", account);
    const results = await Promise.allSettled(
      items.map((itemId) =>
        f.game.exchange("alice", {
          requestId: randomUUID(),
          itemId,
          day: shop.day,
        }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const spent = results.find((result) => result.status === "fulfilled");
    expect((await f.game.profile("alice")).gacha.shards).toBe(
      balance - (spent?.status === "fulfilled" ? spent.value.cost : 0),
    );
    expect(f.repository.exchanges.size).toBe(1);
  });

  it("rejects unauthenticated, forged, insufficient, owned, off-shop and expired purchases without spending", async () => {
    const f = testApi();
    const account = newAccount();
    f.repository.accounts.set("alice", account);
    const call = (body: unknown, token = "alice") =>
      f.app.request("/v1/gacha/exchange", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const shop = await f.game.exchangeShop("alice");
    const request = { requestId: randomUUID(), itemId: shop.items[0], day: shop.day };
    expect((await f.app.request("/v1/gacha/exchange-shop")).status).toBe(401);
    const listed = await f.app.request("/v1/gacha/exchange-shop", {
      headers: { Authorization: "Bearer alice" },
    });
    expect((await listed.json()).items).toEqual(shop.items);
    expect((await f.app.request("/v1/gacha/exchange", { method: "POST" })).status).toBe(401);
    expect((await call(request, "fake-token")).status).toBe(401);
    expect((await call({ ...request, cost: 0 })).status).toBe(400);
    expect((await call({ ...request, rarity: "N" })).status).toBe(400);
    expect((await call({ ...request, day: "tomorrow" })).status).toBe(400);
    expect((await call(request)).status).toBe(409);
    account.profile.gacha.shards = 38;
    account.profile.unlockedItems.push(shop.items[0]);
    f.repository.accounts.set("alice", account);
    expect((await call(request)).status).toBe(409);
    expect((await call({ ...request, itemId: gachaOnlyItems[0] })).status).toBe(409);
    const current = await f.game.exchangeShop("alice");
    const offShop = exchangePool.find(
      (id) => !current.items.includes(id) && !account.profile.unlockedItems.includes(id),
    )!;
    expect((await call({ ...request, itemId: offShop })).status).toBe(409);
    f.advance(86_400_000);
    expect((await call({ ...request, itemId: shop.items[1] })).status).toBe(409);
    expect((await f.game.profile("alice")).gacha.shards).toBe(38);
    expect(f.repository.exchanges.size).toBe(0);
  });

  it("recovers old committed receipts but rejects new blind exchanges", async () => {
    const f = testApi();
    const request = { requestId: randomUUID(), rarity: "R", slot: "hat" } as const;
    const receipt = { ...request, itemId: "hat_star_beret", cost: 8, duplicate: false as const };
    f.repository.exchanges.set("alice/" + request.requestId, receipt);
    expect(await f.game.exchange("alice", request)).toEqual(receipt);
    await expect(f.game.exchange("alice", { ...request, requestId: randomUUID() })).rejects.toThrow(
      "交換方法が新しく",
    );
  });

  it("recovers a legacy duplicate receipt without granting the new reward again", async () => {
    const f = testApi();
    const account = newAccount();
    account.inventoryVersion = 2;
    account.profile.gacha.shards = { UR: 1 };
    account.profile.unlockedItems.push("skin_star_galaxy");
    f.repository.accounts.set("alice", account);
    const requestId = randomUUID();
    const receipt = {
      requestId,
      itemId: "skin_star_galaxy",
      rarity: "UR" as const,
      duplicate: true,
    };
    f.repository.draws.set("alice/" + requestId, receipt);
    expect(await f.game.draw("alice", requestId)).toEqual(receipt);
    expect((await f.game.profile("alice")).gacha.shards).toBe(1);
  });

  it("converts old item shards once without removing legitimately owned gear", async () => {
    const f = testApi();
    const account = newAccount();
    account.inventoryVersion = 1;
    account.profile.unlockedItems.push("skin_star_galaxy", "hat_star_beret");
    account.profile.gacha.shards = {
      skin_star_mint: 3,
      hat_star_beret: 2,
      skin_star_galaxy: 4,
      R: 1,
    };
    f.repository.accounts.set("alice", account);
    const pet = await f.game.profile("alice");
    expect(pet.gacha.shards).toBe(10);
    expect(pet.unlockedItems).toEqual(account.profile.unlockedItems);
    expect(f.repository.accounts.get("alice")?.inventoryVersion).toBe(inventoryVersion);
    expect(await f.game.profile("alice")).toEqual(pet);
  });

  it("combines rarity balances once while preserving existing growth and balances", async () => {
    const f = testApi();
    const account = newAccount();
    account.inventoryVersion = 2;
    account.profile.gacha.shards = { N: 2, R: 3, SR: 4, UR: 1 };
    Object.assign(account.profile, {
      empathy: 50,
      criticalThinking: 34,
      resilience: 0,
      xp: 9,
      confirmedCoins: 12,
    });
    f.repository.accounts.set("alice", account);
    const pet = await f.game.profile("alice");
    expect(pet).toMatchObject({
      empathy: 50,
      criticalThinking: 34,
      resilience: 0,
      xp: 9,
      confirmedCoins: 12,
      gacha: { shards: 10 },
    });
    expect(await f.game.profile("alice")).toEqual(pet);
    expect(f.repository.accounts.get("alice")?.inventoryVersion).toBe(inventoryVersion);
  });
});
