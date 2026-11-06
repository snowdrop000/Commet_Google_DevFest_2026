import { browser } from "wxt/browser";
import { ITEM_CATALOG, starCharacter, statKeys, xpNeeded, type Profile } from "../../shared/game";
import { restingPet, type PetAnimation } from "./pet-animation";
import { StarPet } from "./StarPet";

const frame: Record<Profile["mood"], number> = {
  idle: 0,
  happy: 1,
  cry: 2,
  sad: 2,
  proud: 3,
  levelup: 3,
};
const labels = { empathy: "思いやり", criticalThinking: "考える力", resilience: "しなやかさ" };
const assets = {
  a: "/characters/character-a.png",
  b: "/characters/character-b.png",
  c: "/characters/character-c.png",
  d: "/characters/character-d.png",
  e: "/characters/character-e.png",
} as const;

export function Pet({
  profile,
  mood = profile.mood,
  animation = restingPet,
}: {
  profile: Profile;
  mood?: Profile["mood"];
  animation?: PetAnimation;
}) {
  if (profile.characterType === starCharacter) {
    return <StarPet profile={profile} mood={mood} animation={animation} />;
  }
  const { hat, badge, skin } = profile.equippedItems;
  return (
    <div className="commet-pet" data-mood={mood} aria-label="ピクセルキャラクター">
      <span
        className="commet-sprite"
        data-skin={skin}
        style={{
          backgroundImage: `url("${browser.runtime.getURL(assets[profile.characterType])}")`,
          backgroundPositionY: `${frame[mood] * (100 / 3)}%`,
        }}
      />
      {hat !== "hat_none" && <span className="commet-hat">{ITEM_CATALOG[hat]?.icon}</span>}
      {badge !== "badge_none" && <span className="commet-badge">{ITEM_CATALOG[badge]?.icon}</span>}
    </div>
  );
}

export function Stats({ profile }: { profile: Profile }) {
  const needed = xpNeeded(profile.level);
  return (
    <div className="commet-stats">
      <b>
        LV. {profile.level} ・ XP {profile.xp} / {needed}
      </b>
      {statKeys.map((key) => (
        <label key={key}>
          {labels[key]} <progress max={100} value={profile[key]} /> {profile[key]}
        </label>
      ))}
      <small>
        {profile.totalPosts} 投稿 ・ {profile.streak} 日連続 ・ 確定 {profile.confirmedCoins} 枚
      </small>
    </div>
  );
}
