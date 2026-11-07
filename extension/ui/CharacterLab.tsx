import { useState } from "react";
import { newProfile, ownedEquipment, starCharacter, type Profile } from "../../shared/game";
import { Pet } from "./Pet";
import { PetEquipment } from "./PetEquipment";

const faces = [
  { value: "idle", label: "ノーマル" },
  { value: "happy", label: "喜ぶ" },
  { value: "cry", label: "悲しむ" },
  { value: "proud", label: "考える" },
] as const;
const motions = [
  {
    value: "walk",
    label: "歩く",
    icon: "M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-2 7 3-2 3 3 3 1M9 8l-1 6-4 4m4-4 4 4M3 11l3-1",
  },
  {
    value: "peek",
    label: "読む",
    icon: "M10 5C7 3 4 3 2 4v12c3-1 5-1 8 1 3-2 5-2 8-1V4c-2-1-5-1-8 1Zm0 0v12",
  },
] as const;
type Scene = (typeof faces)[number]["value"] | (typeof motions)[number]["value"];
const basicPet: Profile = { ...newProfile(), characterType: starCharacter };

export function CharacterLab({ profile = null }: { profile?: Profile | null } = {}) {
  const prototype: Profile = profile ? { ...profile, characterType: starCharacter } : basicPet;
  const [scene, setScene] = useState<Scene>("idle");
  const [equipment, setEquipment] = useState(prototype.equippedItems);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const mood: Profile["mood"] = scene === "walk" || scene === "peek" ? "idle" : scene;
  const pet = {
    ...prototype,
    equippedItems: ownedEquipment(starCharacter, equipment, prototype.unlockedItems),
  };
  return (
    <section className="commet-lab" aria-label="ほしもちの試着">
      <div className="commet-lab-heading">
        <h2>ほしもちの試着</h2>
        <p>持っているアイテムで、着せ替えや表情を試せます。</p>
      </div>
      <div className="commet-lab-stage">
        <figure>
          <Pet
            profile={pet}
            mood={mood}
            animation={{ action: scene === "walk" || scene === "peek" ? scene : "idle", direction }}
          />
        </figure>
      </div>
      <div className="commet-wardrobe-tools commet-scene-controls">
        <div className="commet-face-buttons" role="group" aria-label="表情を試す">
          {faces.map(({ value, label }) => (
            <button
              type="button"
              key={value}
              aria-pressed={scene === value}
              onClick={() => setScene(value)}
            >
              <span className="commet-scene-art" aria-hidden="true">
                <Pet profile={pet} mood={value} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="commet-motion-buttons" role="group" aria-label="動きを試す">
          {motions.map(({ value, label, icon }) => (
            <button
              type="button"
              key={value}
              aria-pressed={scene === value}
              onClick={() => setScene(value)}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <path d={icon} />
              </svg>
              {label}
            </button>
          ))}
          {(scene === "walk" || scene === "peek") && (
            <button
              type="button"
              onClick={() => setDirection(direction === "right" ? "left" : "right")}
            >
              向きを反転
            </button>
          )}
        </div>
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
