import { useState } from "react";
import { newProfile, starCharacter, visibleEquipment, type Profile } from "../../shared/game";
import { Pet } from "./Pet";
import { EquipmentSelect } from "./PetEquipment";
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
      <p>目や口、体の柄などを組み合わせて、表情や動きを試せます。</p>
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
      <button
        aria-pressed={compare}
        onClick={() => {
          if (!compare) setScene("idle");
          setCompare(!compare);
        }}
      >
        以前のノーマルと比較
      </button>
      <div className="controls">
        {visibleEquipment(starCharacter)
          .filter((slot) => slot !== "badge")
          .map((slot) => (
            <EquipmentSelect
              key={slot}
              pet={pet}
              slot={slot}
              trial
              onChange={(id) => {
                setEquipment((current) => ({ ...current, [slot]: id }));
                if (slot === "prop") setScene("proud");
              }}
            />
          ))}
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
    </section>
  );
}
