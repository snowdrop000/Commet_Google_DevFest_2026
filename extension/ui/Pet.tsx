import {
  asStarProfile,
  starCharacter,
  statKeys,
  statLabels,
  xpNeeded,
  type Profile,
} from "../../shared/game";
import { restingPet, type PetAnimation } from "./pet-animation";
import { StarPet } from "./StarPet";

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
  return (
    <div className="commet-stats">
      <b>
        <span>LV. {profile.level}</span>
        <span>
          {" "}
          ・ XP {profile.xp} / {needed}
        </span>
      </b>
      <progress className="commet-xp-progress" aria-label="XP" max={needed} value={profile.xp} />
      {statKeys.map((key) => (
        <label key={key}>
          {statLabels[key]} <progress aria-label={statLabels[key]} max={100} value={profile[key]} />{" "}
          {profile[key]}
        </label>
      ))}
      <small>
        {profile.totalPosts} 投稿 ・ {profile.streak} 日連続 ・ 確定 {profile.confirmedCoins} 枚
      </small>
    </div>
  );
}
