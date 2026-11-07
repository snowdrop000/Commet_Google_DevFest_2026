import { createHash } from "node:crypto";
import { ITEM_CATALOG } from "../../shared/game";
import { exchangePool, type ExchangeShop } from "../../shared/gacha";

export const dayJst = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

/** Daily order stays stable; select up to six rewards from this owner's unowned pool. */
export function dailyExchangeShop(now: number, ownedItems: readonly string[] = []): ExchangeShop {
  const day = dayJst(now);
  const score = (id: string) =>
    createHash("sha256").update(`commet-shop-v1:${day}:${id}`).digest("hex");
  const owned = new Set(ownedItems);
  const ranked = exchangePool
    .filter((id) => !owned.has(id))
    .map((id) => ({ id, score: score(id) }))
    .sort((a, b) => a.score.localeCompare(b.score));
  const pick = (kind: "skin" | "hat" | "other") =>
    ranked
      .filter(({ id }) => {
        const slot = ITEM_CATALOG[id].slot;
        return kind === "other" ? slot !== "skin" && slot !== "hat" : slot === kind;
      })
      .slice(0, 2)
      .map(({ id }) => id);
  const preferred = [...pick("skin"), ...pick("hat"), ...pick("other")];
  const selected = new Set(preferred);
  const remaining = ranked.filter(({ id }) => !selected.has(id)).map(({ id }) => id);
  return {
    day,
    serverTime: now,
    refreshAt: Date.parse(`${day}T00:00:00+09:00`) + 86_400_000,
    items: [...preferred, ...remaining].slice(0, 6),
  };
}
