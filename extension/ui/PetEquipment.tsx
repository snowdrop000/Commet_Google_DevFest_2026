import { useId, useState } from "react";
import {
  canEquip,
  defaultEquipment,
  ITEM_CATALOG,
  visibleEquipment,
  type Profile,
} from "../../shared/game";
import { Pet } from "./Pet";
import { displayRarity, gachaOnlyItems, rarities } from "../../shared/gacha";

type Slot = keyof Profile["equippedItems"];
const categories: Record<Slot, { label: string; icon: string }> = {
  skin: { label: "スキン", icon: "m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18" },
  hat: { label: "帽子", icon: "m3 6 5 5 4-7 4 7 5-5-3 13H6L3 6Zm3 10h12" },
  badge: { label: "バッジ", icon: "m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1 3-6Z" },
  eyes: {
    label: "目",
    icon: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
  mouth: { label: "口", icon: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM7 12q5 7 10 0" },
  head: {
    label: "耳・飾り",
    icon: "M12 12c-9 0-10-9-4-9 4 0 4 7 4 9Zm0 0c9 0 10-9 4-9-4 0-4 7-4 9Zm0 0c-9 0-10 9-4 9 4 0 4-7 4-9Zm0 0c9 0 10 9 4 9-4 0-4-7-4-9Z",
  },
  prop: { label: "手持ち", icon: "M4 7h16v13H4V7Zm4 0V4h8v3M4 12q8 4 16 0M10 12v4h4v-4" },
  pattern: {
    label: "体の柄",
    icon: "M12 3h1m4 2 1 1m2 5v2m-2 5-1 1m-4 2h-2m-4-2-1-1m-2-5v-2m2-5 1-1",
  },
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
      <div className="commet-wardrobe-title">
        <h3>{trial ? "試着アイテム" : "所持アイテム"}</h3>
        <span>
          {owned.length} 点{trial ? " 試着可能" : " 所持"}
        </span>
      </div>
      <div className="commet-wardrobe-categories" role="group" aria-label="着せ替えカテゴリ">
        {slots.map((key) => (
          <button
            type="button"
            key={key}
            aria-pressed={key === slot}
            onClick={() => setCategory(key)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d={categories[key].icon} />
            </svg>
            {categories[key].label}
          </button>
        ))}
      </div>
      <div className="commet-wardrobe-content">
        <div className="commet-wardrobe-heading">
          <h3>{categoryLabel}</h3>
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
                      {ITEM_CATALOG[id].acquisition === "level" && (
                        <small className="commet-item-level">レベル報酬</small>
                      )}
                      {gachaOnlyItems.includes(id) && (
                        <small className="commet-item-exclusive">ガチャ限定</small>
                      )}
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
      </div>
      <p className="commet-wardrobe-selection" aria-live="polite">
        <span>{trial ? "試着中" : "選択中"}</span> {ITEM_CATALOG[selected]?.name ?? "—"}
      </p>
    </div>
  );
}
