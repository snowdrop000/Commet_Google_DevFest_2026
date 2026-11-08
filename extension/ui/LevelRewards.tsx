import { ITEM_CATALOG, type Profile } from "../../shared/game";
import {
  levelRewards,
  levelTitle,
  levelTitles,
  milestoneLevels,
  xpUntilLevel,
} from "../../shared/progression";

const rewardLabels = { skin: "スキン", hat: "帽子", badge: "バッジ" };

export function LevelRewards({ profile }: { profile: Profile }) {
  const next = milestoneLevels.find((level) => level > profile.level);
  const rewardsAt = (level: number) => levelRewards.filter((reward) => reward.level === level);
  const titleAt = (level: number) => levelTitles.find((title) => title.level === level);
  const rewardLabel = (slot: string) => rewardLabels[slot as keyof typeof rewardLabels] ?? "装備";
  return (
    <section className="commet-level-rewards" aria-label="レベル報酬">
      <p className="commet-earned-title">
        <span>称号</span> {levelTitle(profile.level)}
      </p>
      <div className="commet-next-unlock">
        {next ? (
          <>
            <b>
              LV. {next} で{" "}
              {[
                ...rewardsAt(next).map(({ slot }) => rewardLabel(slot)),
                ...(titleAt(next) ? ["称号"] : []),
              ].join("・")}
              を解放
            </b>
            <span>あと {xpUntilLevel(profile, next).toLocaleString()} XP</span>
          </>
        ) : (
          <b>すべてのレベル報酬を解放しました！</b>
        )}
      </div>
      <details>
        <summary>レベル報酬を見る</summary>
        <p className="commet-level-guide">
          投稿でXPをためると、自動で受け取れます。装備は着せ替えから選べます。
        </p>
        <ol className="commet-level-roadmap">
          {milestoneLevels.map((level) => {
            const unlocked = profile.level >= level;
            const title = titleAt(level);
            return (
              <li key={level} data-unlocked={unlocked}>
                <b>LV. {level}</b>
                <div>
                  {rewardsAt(level).map(({ itemId, slot }) => (
                    <span key={itemId}>
                      {unlocked ? ITEM_CATALOG[itemId].name : `${rewardLabel(slot)}解放`}
                    </span>
                  ))}
                  {title && <span>{unlocked ? `称号「${title.name}」` : "新しい称号"}</span>}
                </div>
                <small>{unlocked ? "獲得済み" : "未解放"}</small>
              </li>
            );
          })}
        </ol>
      </details>
    </section>
  );
}
