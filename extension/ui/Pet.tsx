import {
  asStarProfile,
  starCharacter,
  statKeys,
  MAX_LEVEL,
  MAX_STAT,
  statLabels,
  xpNeeded,
  type Profile,
} from "../../shared/game";
import { restingPet, type PetAnimation } from "./pet-animation";
import { StarPet } from "./StarPet";
import { LevelRewards } from "./LevelRewards";

export function Pet({
  profile,
  mood = profile.mood,
  animation = restingPet,
}: {
  profile: Profile;
  mood?: Profile["mood"];
  animation?: PetAnimation;
}) {
  const shown = profile.characterType === starCharacter ? profile : asStarProfile(profile);
  return <StarPet profile={shown} mood={mood} animation={animation} />;
}

export function Stats({ profile }: { profile: Profile }) {
  const needed = xpNeeded(profile.level);
  const maxLevel = profile.level === MAX_LEVEL;
  return (
    <div className="commet-stats">
      <b>
        <span>LV. {profile.level}</span>
        <span> ・ {maxLevel ? "MAX" : `XP ${profile.xp} / ${needed}`}</span>
      </b>
      <progress
        className="commet-xp-progress"
        aria-label="XP"
        max={needed}
        value={maxLevel ? needed : profile.xp}
      />
      {statKeys.map((key) => (
        <label key={key}>
          {statLabels[key]}{" "}
          <progress aria-label={statLabels[key]} max={MAX_STAT} value={profile[key]} />{" "}
          {profile[key]}
        </label>
      ))}
      <small>
        {profile.totalPosts} 投稿 ・ {profile.streak} 日連続 ・ 確定 {profile.confirmedCoins} 枚
      </small>
      <LevelRewards profile={profile} />
    </div>
  );
}
