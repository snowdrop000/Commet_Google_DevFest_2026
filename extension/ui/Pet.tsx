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

const contributionAxes = [
  ["appreciation", "感謝・応援", 0, -1],
  ["constructiveness", "提案・議論", 1, 0],
  ["information", "質問・情報", 0, 1],
  ["humor", "ユーモア", -1, 0],
] as const;

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
  const contributions = profile.growth.contributions;
  const largest = Math.max(...contributionAxes.map(([key]) => contributions[key]));
  const points = contributionAxes.map(([key, , x, y]) => {
    const radius = largest ? (66 * contributions[key]) / largest : 0;
    return [130 + x * radius, 110 + y * radius];
  });
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
        {profile.totalPosts} 投稿 ・ {profile.streak} 日連続
      </small>
      <details className="commet-comment-tendencies">
        <summary>コメントの傾向を見る</summary>
        <svg
          className="commet-tendency-chart"
          viewBox="0 0 260 220"
          role="img"
          aria-label={`コメントの傾向。累積の貢献点：${contributionAxes
            .map(([key, label]) => `${label} ${contributions[key]}点`)
            .join("、")}`}
          focusable="false"
        >
          <g className="commet-tendency-grid" aria-hidden="true">
            {[22, 44, 66].map((radius) => (
              <circle key={radius} cx="130" cy="110" r={radius} />
            ))}
            <path d="M130 44v132M64 110h132" />
          </g>
          {largest > 0 && (
            <g aria-hidden="true">
              <polygon className="commet-tendency-area" points={points.join(" ")} />
              {points.map(([x, y], index) => (
                <circle
                  key={contributionAxes[index][0]}
                  className="commet-tendency-point"
                  cx={x}
                  cy={y}
                  r="2.5"
                />
              ))}
            </g>
          )}
          <g className="commet-tendency-labels" aria-hidden="true">
            {contributionAxes.map(([key, label, x, y]) => (
              <text key={key} x={130 + x * 100} y={110 + y * 96}>
                {label}
              </text>
            ))}
          </g>
          {largest === 0 && (
            <text className="commet-tendency-empty" x="130" y="110" aria-hidden="true">
              まだ傾向がありません
            </text>
          )}
        </svg>
      </details>
      <LevelRewards profile={profile} />
    </div>
  );
}
