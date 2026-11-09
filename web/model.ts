import { z } from "zod";
import {
  appearance,
  canEquip,
  equipmentKeys,
  ITEM_CATALOG,
  newProfile,
  profile,
  starCharacter,
  totalShards,
  type Appearance,
} from "../shared/game";
import {
  displayRarity,
  duplicateShardRewards,
  exchangePool,
  exchangeRequest,
  exchangeResult,
  gachaPool,
  gachaRates,
  gachaResult,
  GACHA_COST,
  shardCosts,
  type ExchangeRequest,
  type ExchangeShop,
  type Rarity,
} from "../shared/gacha";
import { analysisResult, type Analysis } from "../shared/model";
import { dayJst } from "../shared/day";
import { withLevelRewards } from "../shared/progression";
import { applyGrowth } from "../server/service/growth";
import type { Message } from "../extension/core/messages";

const key = "commet.web-demo.v1";
const savedState = z.object({
  version: z.literal(1),
  profile,
  draw: gachaResult.nullable(),
  exchange: exchangeRequest.nullable(),
  exchangeReceipt: exchangeResult.nullable(),
  consumed: z.array(z.string()).max(100),
});
type Saved = z.infer<typeof savedState>;
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

function initial(): Saved {
  const pet = newProfile();
  pet.confirmedCoins = 30;
  pet.gacha.shards = 20;
  return {
    version: 1,
    profile: pet,
    draw: null,
    exchange: null,
    exchangeReceipt: null,
    consumed: [],
  };
}

/** This store never reads or writes production profiles, balances, or receipts. */
export class DemoStore {
  private state: Saved = initial();
  private readonly listeners = new Set<() => void>();
  storageAvailable = true;
  constructor(
    private readonly storage?: Storage,
    private readonly random = (upper: number) => Math.floor(Math.random() * upper),
  ) {
    if (!storage) this.storageAvailable = false;
    try {
      const raw = storage?.getItem(key);
      if (raw) this.state = savedState.parse(JSON.parse(raw));
    } catch {
      this.storageAvailable = false;
    }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private save(next: Saved) {
    this.state = savedState.parse(next);
    try {
      this.storage?.setItem(key, JSON.stringify(this.state));
    } catch {
      this.storageAvailable = false;
    }
    this.listeners.forEach((listener) => listener());
  }
  reset() {
    this.save(initial());
  }
  saveAppearance(input: Appearance) {
    const next = appearance.parse(input);
    for (const slot of equipmentKeys) {
      if (
        !this.state.profile.unlockedItems.includes(next.equippedItems[slot]) ||
        !canEquip(starCharacter, slot, next.equippedItems[slot])
      )
        throw new Error("所持しているアイテムを選んでください。");
    }
    this.save({ ...this.state, profile: { ...this.state.profile, ...next } });
  }
  creditCoins(coins: number) {
    if (!Number.isSafeInteger(coins) || coins < 0) throw new Error("コイン数が正しくありません。");
    if (coins)
      this.save({
        ...this.state,
        profile: {
          ...this.state.profile,
          confirmedCoins: this.state.profile.confirmedCoins + coins,
        },
      });
  }
  post(input: Analysis, nonce: string, pendingCoins = 3) {
    if (this.state.consumed.includes(nonce)) return false;
    const result = analysisResult.parse(input);
    const pet = structuredClone(this.state.profile);
    applyGrowth(pet, result, Date.now());
    pet.confirmedCoins += Math.floor(pendingCoins * result.coinMultiplier);
    this.save({
      ...this.state,
      profile: withLevelRewards(pet),
      consumed: [...this.state.consumed, nonce].slice(-100),
    });
    return true;
  }
  async shop(now = Date.now()): Promise<ExchangeShop> {
    const day = dayJst(now);
    const owned = new Set(this.state.profile.unlockedItems);
    const ranked = await Promise.all(
      exchangePool
        .filter((id) => !owned.has(id))
        .map(async (id) => {
          const hash = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(`commet-shop-v1:${day}:${id}`),
          );
          const score = [...new Uint8Array(hash)]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          return { id, score };
        }),
    );
    ranked.sort((a, b) => a.score.localeCompare(b.score));
    const pick = (kind: "skin" | "hat" | "other") =>
      ranked
        .filter(({ id }) => {
          const slot = ITEM_CATALOG[id].slot;
          return kind === "other" ? slot !== "skin" && slot !== "hat" : slot === kind;
        })
        .slice(0, 2)
        .map(({ id }) => id);
    const preferred = [...pick("skin"), ...pick("hat"), ...pick("other")];
    return {
      day,
      serverTime: now,
      refreshAt: Date.parse(`${day}T00:00:00+09:00`) + 86_400_000,
      items: [
        ...preferred,
        ...ranked.map(({ id }) => id).filter((id) => !preferred.includes(id)),
      ].slice(0, 6),
    };
  }
  private draw() {
    if (this.state.draw) return this.state.draw;
    if (this.state.profile.confirmedCoins < GACHA_COST)
      throw new Error("確定コインが10枚必要です。体験投稿で集められます。");
    const roll = this.random(100);
    const rarity: Rarity =
      roll < gachaRates.N
        ? "N"
        : roll < gachaRates.N + gachaRates.R
          ? "R"
          : roll < 100 - gachaRates.UR
            ? "SR"
            : "UR";
    const candidates = gachaPool.filter((id) => (displayRarity[id] ?? "N") === rarity);
    const itemId = candidates[this.random(candidates.length)];
    const pet = structuredClone(this.state.profile);
    const duplicate = pet.unlockedItems.includes(itemId);
    const shardsAwarded = duplicate ? duplicateShardRewards[rarity] : 0;
    pet.confirmedCoins -= GACHA_COST;
    pet.gacha.draws++;
    pet.gacha.sinceSR = rarity === "SR" || rarity === "UR" ? 0 : pet.gacha.sinceSR + 1;
    pet.gacha.sinceUR = rarity === "UR" ? 0 : pet.gacha.sinceUR + 1;
    if (duplicate) pet.gacha.shards = totalShards(pet.gacha.shards) + shardsAwarded;
    else pet.unlockedItems.push(itemId);
    const receipt = { requestId: crypto.randomUUID(), itemId, rarity, duplicate, shardsAwarded };
    this.save({ ...this.state, profile: pet, draw: receipt });
    return receipt;
  }
  private async exchange(input: ExchangeRequest) {
    if (!("itemId" in input)) throw new Error("今日のラインナップから選んでください。");
    if (this.state.exchange) {
      const previous = this.state.exchangeReceipt;
      if (
        previous?.requestId === input.requestId &&
        previous.itemId === input.itemId &&
        previous.day === input.day
      )
        return previous;
      throw new Error("前回の交換結果を先に確認してください。");
    }
    const shop = await this.shop();
    const pet = structuredClone(this.state.profile);
    if (
      shop.day !== input.day ||
      !shop.items.includes(input.itemId) ||
      pet.unlockedItems.includes(input.itemId)
    )
      throw new Error("交換所を読み込み直してください。");
    const rarity = displayRarity[input.itemId] ?? "N";
    const cost = shardCosts[rarity];
    if (totalShards(pet.gacha.shards) < cost) throw new Error(`星のかけらが${cost}個必要です。`);
    pet.gacha.shards = totalShards(pet.gacha.shards) - cost;
    pet.unlockedItems.push(input.itemId);
    const receipt = {
      ...input,
      rarity,
      slot: ITEM_CATALOG[input.itemId].slot,
      cost,
      duplicate: false as const,
    };
    this.save({ ...this.state, profile: pet, exchange: input, exchangeReceipt: receipt });
    return receipt;
  }
  private queue = Promise.resolve();
  dispatch(input: Message): Promise<unknown> {
    const run = this.queue.then(async () => {
      switch (input.type) {
        case "gacha":
          return this.draw();
        case "gachaPending":
          return this.state.draw ? { requestId: this.state.draw.requestId } : null;
        case "gachaAck":
          if (this.state.draw?.requestId === input.requestId)
            this.save({ ...this.state, draw: null });
          return null;
        case "exchangeShop":
          return this.shop();
        case "exchangePending":
          return this.state.exchange;
        case "exchange":
          return this.exchange(
            exchangeRequest.parse({
              ...input.selection,
              requestId: input.requestId ?? crypto.randomUUID(),
            }),
          );
        case "exchangeAck":
          if (this.state.exchange?.requestId === input.requestId)
            this.save({ ...this.state, exchange: null, exchangeReceipt: null });
          return null;
        default:
          throw new Error("この操作は拡張機能で利用できます。");
      }
    });
    this.queue = run.then(
      () => {},
      () => {},
    );
    return run;
  }
}

function browserStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
export const demoStore = new DemoStore(browserStorage());
