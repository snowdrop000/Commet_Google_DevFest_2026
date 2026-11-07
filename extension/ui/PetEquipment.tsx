import { useId, useState } from "react";
import {
  canEquip,
  defaultEquipment,
  ITEM_CATALOG,
  visibleEquipment,
  type Profile,
} from "../../shared/game";
import { Pet } from "./Pet";

type Slot = keyof Profile["equippedItems"];
const categories: Record<Slot, { label: string; icon: string }> = {
  skin: { label: "スキン", icon: "◈" },
  hat: { label: "帽子", icon: "♛" },
  badge: { label: "バッジ", icon: "✦" },
  eyes: { label: "目", icon: "◉" },
  mouth: { label: "口", icon: "ω" },
  head: { label: "耳・飾り", icon: "♧" },
  prop: { label: "手持ち", icon: "▣" },
  pattern: { label: "体の柄", icon: "◌" },
};

const rarities = [
  { id: "UR", label: "ウルトラレア" },
  { id: "SR", label: "スーパーレア" },
  { id: "R", label: "レア" },
  { id: "N", label: "ノーマル" },
] as const;
type Rarity = (typeof rarities)[number]["id"];

// Display tiers for the wardrobe. The profile remains the source of item ownership.
const displayRarity: Partial<Record<string, Rarity>> = {
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

export function PetEquipment({
  pet,
  trial = false,
  onChange,
}: {
  pet: Profile;
  trial?: boolean;
  onChange: (slot: Slot, id: string) => void;
}) {
  const [category, setCategory] = useState<Slot>("skin");
  const idPrefix = useId();
  const slots = visibleEquipment(pet.characterType).filter((slot) => !trial || slot !== "badge");
  const slot = slots.includes(category) ? category : "skin";
  const selected = pet.equippedItems[slot];
  const owned = pet.unlockedItems.filter((id) => canEquip(pet.characterType, slot, id));
  const categoryLabel = categories[slot].label;

  return (
    <div
      className="commet-wardrobe"
      role="region"
      aria-label={trial ? "試着アイテム" : "所持アイテム"}
    >
      <div className="commet-wardrobe-categories" role="group" aria-label="着せ替えカテゴリ">
        {slots.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={key === slot}
            onClick={() => setCategory(key)}
          >
            <span aria-hidden="true">{categories[key].icon}</span>
            {categories[key].label}
          </button>
        ))}
      </div>
      <div className="commet-wardrobe-content">
        <div className="commet-wardrobe-heading">
          <h3>{categoryLabel}</h3>
          <span>
            {owned.length} 点{trial ? " 試着可能" : " 所持"}
          </span>
        </div>
        <div className="commet-wardrobe-items" key={slot}>
          {rarities.map(({ id: rarity, label }) => {
            const items = owned.filter((id) => (displayRarity[id] ?? "N") === rarity);
            if (!items.length) return null;
            const labelId = `${idPrefix}-${rarity}`;
            return (
              <div
                className="commet-wardrobe-tier"
                key={rarity}
                data-rarity={rarity}
                role="group"
                aria-labelledby={labelId}
              >
                <h4 id={labelId}>
                  <b>{rarity}</b> {label}
                </h4>
                <div className="commet-wardrobe-grid">
                  {items.map((id) => (
                    <button
                      className="commet-wardrobe-item"
                      type="button"
                      key={id}
                      aria-label={ITEM_CATALOG[id].name}
                      aria-pressed={id === selected}
                      title={ITEM_CATALOG[id].name}
                      onClick={() => onChange(slot, id)}
                    >
                      <span className="commet-wardrobe-art" data-slot={slot} aria-hidden="true">
                        <Pet
                          profile={{ ...pet, equippedItems: { ...defaultEquipment, [slot]: id } }}
                          mood={slot === "prop" ? "proud" : "idle"}
                        />
                      </span>
                      <span className="commet-wardrobe-name">{ITEM_CATALOG[id].name}</span>
                      {id === selected && (
                        <span className="commet-wardrobe-tick" aria-hidden="true">
                          ✓
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {!owned.length && (
            <p className="commet-wardrobe-empty">このカテゴリの所持アイテムはまだありません。</p>
          )}
        </div>
        <p className="commet-wardrobe-selection" aria-live="polite">
          <span>{trial ? "試着中" : "選択中"}</span> {ITEM_CATALOG[selected]?.name ?? "—"}
        </p>
      </div>
    </div>
  );
}
