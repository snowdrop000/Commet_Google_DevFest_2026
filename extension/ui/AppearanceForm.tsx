import { useId, useState, type FormEvent } from "react";
import {
  appearance,
  starCharacter,
  ownedEquipment,
  type Appearance,
  type Profile,
} from "../../shared/game";
import { Pet } from "./Pet";
import { PetEquipment } from "./PetEquipment";

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
  const character = starCharacter;
  const [equipment, setEquipment] = useState(() =>
    ownedEquipment(character, pet.equippedItems, pet.unlockedItems),
  );
  const [mood, setMood] = useState<Profile["mood"]>("idle");
  const nameHint = useId();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const parsed = appearance.safeParse({
      name: new FormData(event.currentTarget).get("name"),
      characterType: character,
      equippedItems: ownedEquipment(character, equipment, pet.unlockedItems),
    });
    if (parsed.success) void onSave(parsed.data);
  }

  const preview: Profile = {
    ...pet,
    characterType: character,
    equippedItems: ownedEquipment(character, equipment, pet.unlockedItems),
  };
  return (
    <form onSubmit={submit}>
      {!fixedCharacter && <h2>ほしもちの着せ替え</h2>}
      <fieldset className="commet-appearance-fields" disabled={saving}>
        <div className="commet-lab-stage commet-wardrobe-preview">
          <Pet profile={preview} mood={mood} />
          <div className="commet-wardrobe-profile">
            <label>
              なまえ{" "}
              <input
                name="name"
                defaultValue={pet.name}
                maxLength={12}
                pattern=".*\S.*"
                title="空白以外の文字を含めて、1〜12文字で入力してください。"
                aria-describedby={nameHint}
                required
              />
            </label>
            <small id={nameHint}>1〜12文字。あとから何度でも変更できます。</small>
          </div>
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
