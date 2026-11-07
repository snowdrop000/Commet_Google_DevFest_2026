import { z } from "zod";
import { canEquip, ITEM_CATALOG, starCharacter, starterItems } from "./game";

export const GACHA_COST = 10;
export const gachaRequest = z.strictObject({ requestId: z.uuid() });
export const gachaResult = z.strictObject({
  requestId: z.uuid(),
  itemId: z.string(),
  rarity: z.enum(["N", "R", "SR", "UR"]),
  duplicate: z.boolean(),
  shardsAwarded: z.number().int().nonnegative().optional(),
});
export type GachaResult = z.infer<typeof gachaResult>;
export const gachaRates = { N: 70, R: 24, SR: 5, UR: 1 } as const;

export const gachaPool = Object.keys(ITEM_CATALOG).filter((id) => {
  const item = ITEM_CATALOG[id];
  return (
    !starterItems.includes(id) &&
    (item.character === starCharacter || item.slot === "badge") &&
    canEquip(starCharacter, item.slot, id)
  );
});

export const rarities = [
  { id: "UR", label: "ウルトラレア" },
  { id: "SR", label: "スーパーレア" },
  { id: "R", label: "レア" },
  { id: "N", label: "ノーマル" },
] as const;
export type Rarity = (typeof rarities)[number]["id"];

// Shared by server-side draws and the wardrobe. Ownership comes from the profile.
export const displayRarity: Partial<Record<string, Rarity>> = {
  skin_star_galaxy: "UR",
  skin_star_kintsugi: "UR",
  skin_aurora: "UR",
  hat_star_wizard: "UR",
  skin_star_pixel: "SR",
  skin_star_soda: "SR",
  skin_star_strawberry: "SR",
  skin_star_toast: "SR",
  skin_midnight: "SR",
  head_star_ice: "SR",
  hat_star_crown: "SR",
  hat_star_graduate: "SR",
  hat_crown: "SR",
  eyes_star_shine: "SR",
  eyes_star_digital: "SR",
  skin_star_night: "R",
  skin_star_mint: "R",
  skin_sunset: "R",
  head_moon: "R",
  head_star_bunny: "R",
  head_star_cat: "R",
  head_star_cloud: "R",
  hat_star_beret: "R",
  hat_star_pin: "R",
  hat_star_mushroom: "R",
  hat_star_pumpkin: "R",
  hat_heart: "R",
  hat_scholar: "R",
  hat_halo: "R",
  eyes_glimmer: "R",
  eyes_star_heart: "R",
  eyes_star_odd: "R",
  pattern_stars: "R",
  // Everyday set. Unlisted items (fang, border, clover) stay N.
  skin_star_choco: "SR",
  eyes_star_wink: "R",
  // Halloween: unlisted items (badge, pattern) stay N.
  hat_star_witch: "UR",
  skin_star_pumpkin: "SR",
  head_star_bat: "SR",
  eyes_star_jack: "R",
  mouth_star_jack: "R",
  prop_star_candy: "R",
  skin_star_franken: "SR",
  skin_star_mummy: "SR",
  skin_star_zombie: "SR",
  skin_star_ghost: "R",
  head_star_bolt: "R",
  eyes_star_spiral: "R",
  // Christmas: unlisted items (badge, eyes, pattern) stay N.
  hat_star_tree: "UR",
  skin_star_ginger: "SR",
  hat_star_santa: "SR",
  head_star_antler: "R",
  head_star_holly: "R",
  mouth_star_cane: "R",
  prop_star_cocoa: "R",
  prop_star_gift: "R",
};

export const duplicateShardRewards = { N: 1, R: 3, SR: 5, UR: 8 } as const;
export const shardCosts = { N: 3, R: 5, SR: 10, UR: 20 } as const;
// Special motifs stay exclusive to gacha. All other pool items can be exchanged.
export const gachaOnlyItems: readonly string[] = [
  "hat_star_top",
  "hat_star_pumpkin",
  "hat_star_witch",
  "hat_star_tree",
  "eyes_star_odd",
  "skin_star_pixel",
  "skin_star_soda",
  "skin_star_strawberry",
  "skin_star_galaxy",
  "hat_star_wizard",
];
export const exchangeSlots = {
  skin: "スキン",
  hat: "帽子",
  badge: "バッジ",
  eyes: "目",
  mouth: "口",
  head: "耳・飾り",
  prop: "手持ち",
  pattern: "体の柄",
} as const;
const legacyExchangeSelection = z.strictObject({
  rarity: z.enum(["N", "R", "SR", "UR"]),
  slot: z.enum(["skin", "hat", "badge", "eyes", "mouth", "head", "prop", "pattern"]),
});
const shopDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const dailyExchangeSelection = z.strictObject({ itemId: z.string().min(1).max(48), day: shopDay });
// Keep old requests readable solely to recover receipts already committed before the daily shop.
export const exchangeSelection = z.union([dailyExchangeSelection, legacyExchangeSelection]);
export const exchangeRequest = z.union([
  dailyExchangeSelection.extend({ requestId: z.uuid() }),
  legacyExchangeSelection.extend({ requestId: z.uuid() }),
]);
export const exchangeResult = gachaResult.extend({
  duplicate: z.literal(false),
  slot: legacyExchangeSelection.shape.slot,
  cost: z.number().int().positive(),
  day: shopDay.optional(),
});
export const exchangeShop = z.strictObject({
  day: shopDay,
  serverTime: z.number().int(),
  refreshAt: z.number().int(),
  items: z.array(z.string()).max(6),
});
export type ExchangeShop = z.infer<typeof exchangeShop>;
export type ExchangeSelection = z.infer<typeof exchangeSelection>;
export type ExchangeRequest = z.infer<typeof exchangeRequest>;
export type ExchangeResult = z.infer<typeof exchangeResult>;

export const exchangePool = gachaPool.filter((id) => !gachaOnlyItems.includes(id));
