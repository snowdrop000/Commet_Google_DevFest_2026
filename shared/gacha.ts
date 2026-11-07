import { z } from "zod";
import { canEquip, ITEM_CATALOG, starCharacter } from "./game";

export const GACHA_COST = 10;
export const gachaRequest = z.strictObject({ requestId: z.uuid() });
export const gachaResult = z.strictObject({
  requestId: z.uuid(),
  itemId: z.string(),
  rarity: z.enum(["N", "R", "SR", "UR"]),
  duplicate: z.boolean(),
});
export type GachaResult = z.infer<typeof gachaResult>;
export const gachaRates = { N: 70, R: 24, SR: 5, UR: 1 } as const;

export const gachaPool = Object.keys(ITEM_CATALOG).filter((id) => {
  const item = ITEM_CATALOG[id];
  return (
    item.hint !== "最初から所持" &&
    (item.character === starCharacter || item.slot === "badge") &&
    canEquip(starCharacter, item.slot, id) &&
    !["head_none", "prop_none", "pattern_none"].includes(id)
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
};
