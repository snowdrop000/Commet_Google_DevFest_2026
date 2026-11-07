import { useRef, useState } from "react";
import { newProfile, starCharacter, type Profile } from "../../shared/game";
import { CoinPickup, type Pickup } from "./CoinPickup";
import { Pet } from "./Pet";

const pet: Profile = { ...newProfile(), characterType: starCharacter, name: "ほしもち" };
export function RewardLab() {
  const stage = useRef<HTMLDivElement>(null);
  const [pickup, setPickup] = useState<Pickup | null>(null);
  return (
    <section aria-label="報酬アニメーションのプレビュー">
      <h2>報酬アニメーションのプレビュー</h2>
      <p>動きを試せます。コインと所持アイテムの数は変わりません。</p>
      <div className="commet-lab-stage">
        <div ref={stage} className="commet-drag">
          <Pet profile={pet} animation={{ action: "walk", direction: "right" }} />
        </div>
        <button
          disabled={Boolean(pickup)}
          onClick={() => {
            const rect = stage.current?.querySelector(".commet-pet")?.getBoundingClientRect();
            if (rect) setPickup({ id: crypto.randomUUID(), x: rect.left, y: rect.top });
          }}
        >
          コイン獲得演出を試す
        </button>
      </div>
      {pickup && <CoinPickup key={pickup.id} pickup={pickup} onFinish={() => setPickup(null)} />}
    </section>
  );
}
