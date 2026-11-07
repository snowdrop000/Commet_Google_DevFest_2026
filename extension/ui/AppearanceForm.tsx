import { useState, type FormEvent } from "react";
import {
  appearance,
  canEquip,
  CHARACTER_TYPES,
  defaultEquipment,
  equipmentKeys,
  type Appearance,
  type Profile,
} from "../../shared/game";
import { Pet } from "./Pet";
import { PetEquipment } from "./PetEquipment";

function equipmentFor(
  character: Appearance["characterType"],
  current: Appearance["equippedItems"],
) {
  const next = { ...current };
  for (const slot of equipmentKeys) {
    if (!canEquip(character, slot, current[slot])) next[slot] = defaultEquipment[slot];
  }
  return next;
}

export function AppearanceForm({
  pet,
  fixedCharacter,
  saving = false,
  onSave,
}: {
  pet: Profile;
  fixedCharacter?: Appearance["characterType"];
  saving?: boolean;
  onSave: (value: Appearance) => Promise<void>;
}) {
  const [character, setCharacter] = useState(fixedCharacter ?? pet.characterType);
  const [equipment, setEquipment] = useState(() => equipmentFor(character, pet.equippedItems));
  const [mood, setMood] = useState<Profile["mood"]>("idle");

  function chooseCharacter(value: string) {
    const result = appearance.shape.characterType.safeParse(value);
    if (!result.success) return;
    setCharacter(result.data);
    setEquipment((current) => equipmentFor(result.data, current));
    setMood("idle");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const parsed = appearance.safeParse({
      name: fixedCharacter ? pet.name : new FormData(event.currentTarget).get("name"),
      characterType: character,
      equippedItems: equipment,
    });
    if (parsed.success) void onSave(parsed.data);
  }

  const preview = { ...pet, characterType: character, equippedItems: equipment };
  return (
    <form onSubmit={submit}>
      {!fixedCharacter && <h2>キャラクリ・着せ替え</h2>}
      <fieldset className="commet-appearance-fields" disabled={saving}>
        <div className="commet-lab-stage commet-wardrobe-preview">
          <Pet profile={preview} mood={mood} />
          {!fixedCharacter && (
            <div className="commet-wardrobe-profile">
              <label>
                なまえ <input name="name" defaultValue={pet.name} maxLength={12} required />
              </label>
              <label>
                初期キャラ{" "}
                <select
                  name="characterType"
                  value={character}
                  onChange={(event) => chooseCharacter(event.currentTarget.value)}
                >
                  {Object.entries(CHARACTER_TYPES).map(([id, value]) => (
                    <option key={id} value={id}>
                      {id.toUpperCase()} · {value.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
        <PetEquipment
          pet={preview}
          onChange={(slot, id) => {
            setEquipment((current) => ({ ...current, [slot]: id }));
            setMood(slot === "prop" ? "proud" : "idle");
          }}
        />
      </fieldset>
      <div className="commet-wardrobe-save">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? "保存中…" : fixedCharacter ? "着せ替えを保存" : "キャラ設定を保存"}
        </button>
      </div>
    </form>
  );
}
