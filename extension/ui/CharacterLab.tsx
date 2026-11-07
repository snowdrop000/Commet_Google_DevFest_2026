import { useState } from "react";
import { newProfile, starCharacter, type Profile } from "../../shared/game";
import { Pet } from "./Pet";
import { PetEquipment } from "./PetEquipment";
import { PreviousStanding } from "./StarPet";

const scenes = {
  idle: "ノーマル",
  happy: "喜んでいる",
  cry: "悲しんでいる",
  proud: "学んでいる",
  walk: "もちもち歩き",
  peek: "覗き込む",
} as const;
type Scene = keyof typeof scenes;
const prototype: Profile = { ...newProfile(), characterType: starCharacter };

export function CharacterLab() {
  const [scene, setScene] = useState<Scene>("idle");
  const [equipment, setEquipment] = useState(prototype.equippedItems);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [compare, setCompare] = useState(false);
  const mood: Profile["mood"] = scene === "walk" || scene === "peek" ? "idle" : scene;
  const pet = { ...prototype, equippedItems: equipment };
  return (
    <section className="commet-lab" aria-label="ほしもちの試着">
      <h2>ほしもちの試着</h2>
      <p>カテゴリを選んで、イラストから着せ替えや表情を試せます。</p>
      <div className="commet-lab-stage">
        {compare && (
          <figure>
            <PreviousStanding />
            <figcaption>以前のノーマル</figcaption>
          </figure>
        )}
        <figure>
          <Pet
            profile={pet}
            mood={mood}
            animation={{ action: scene === "walk" || scene === "peek" ? scene : "idle", direction }}
          />
          {compare && <figcaption>現在のほしもち</figcaption>}
        </figure>
      </div>
      <div className="controls commet-wardrobe-tools">
        <button
          type="button"
          aria-pressed={compare}
          onClick={() => {
            if (!compare) setScene("idle");
            setCompare(!compare);
          }}
        >
          以前のノーマルと比較
        </button>
        <label>
          動き{" "}
          <select value={scene} onChange={(event) => setScene(event.currentTarget.value as Scene)}>
            {Object.entries(scenes).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(scene === "walk" || scene === "peek") && (
          <button onClick={() => setDirection(direction === "right" ? "left" : "right")}>
            向きを反転
          </button>
        )}
      </div>
      <PetEquipment
        pet={pet}
        trial
        onChange={(slot, id) => {
          setEquipment((current) => ({ ...current, [slot]: id }));
          if (slot === "prop") setScene("proud");
          if ((slot === "eyes" || slot === "mouth") && (scene === "happy" || scene === "cry")) {
            setScene("idle");
          }
        }}
      />
    </section>
  );
}
