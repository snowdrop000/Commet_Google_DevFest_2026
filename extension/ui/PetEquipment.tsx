import { canEquip, ITEM_CATALOG, type Profile } from "../../shared/game";

type Slot = keyof Profile["equippedItems"];
const labels: Record<Slot, string> = {
  skin: "スキン",
  hat: "帽子",
  badge: "アクセサリー",
  eyes: "目",
  mouth: "口",
  head: "頭の飾り",
  prop: "手持ち（学習時）",
  pattern: "体の柄",
};

export function EquipmentSelect({
  pet,
  slot,
  trial = false,
  onChange,
}: {
  pet: Profile;
  slot: Slot;
  trial?: boolean;
  onChange: (id: string) => void;
}) {
  const label = trial ? (slot === "hat" ? "試着の帽子" : `試着${labels[slot]}`) : labels[slot];
  return (
    <label>
      {label}{" "}
      <select
        name={trial ? undefined : slot}
        aria-label={label}
        value={pet.equippedItems[slot]}
        onChange={(event) => onChange(event.currentTarget.value)}
      >
        {pet.unlockedItems
          .filter((id) => canEquip(pet.characterType, slot, id))
          .map((id) => (
            <option key={id} value={id}>
              {ITEM_CATALOG[id].name}
            </option>
          ))}
      </select>
    </label>
  );
}
