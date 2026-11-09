import { ITEM_CATALOG, MAX_LEVEL, xpNeeded, type Profile } from "./game";

export const levelRewards = Object.entries(ITEM_CATALOG)
  .flatMap(([itemId, item]) =>
    item.acquisition === "level" && item.requirement?.type === "level"
      ? [{ level: item.requirement.value, itemId, slot: item.slot }]
      : [],
  )
  .sort((a, b) => a.level - b.level);

export const levelTitles = [
  { level: 1, name: "はじまりのほし" },
  { level: 3, name: "ほしの見習い" },
  { level: 5, name: "ほしの旅人" },
  { level: 10, name: "ほしの案内人" },
  { level: 20, name: "ほしの守り手" },
  { level: 30, name: "ほしの賢者" },
  { level: 50, name: "ほしの語り部" },
  { level: 99, name: "ほしの伝説" },
] as const;

export function levelTitle(level: number): string {
  return (
    [...levelTitles].reverse().find((title) => title.level <= level)?.name ?? levelTitles[0].name
  );
}

export function withLevelRewards(pet: Profile): Profile {
  const earned = levelRewards.filter(
    ({ level, itemId }) => pet.level >= level && !pet.unlockedItems.includes(itemId),
  );
  return earned.length
    ? { ...pet, unlockedItems: [...pet.unlockedItems, ...earned.map(({ itemId }) => itemId)] }
    : pet;
}

export const milestoneLevels = [
  ...new Set([
    ...levelRewards.map(({ level }) => level),
    ...levelTitles.filter(({ level }) => level > 1).map(({ level }) => level),
  ]),
].sort((a, b) => a - b);

export function xpUntilLevel(pet: Pick<Profile, "level" | "xp">, target: number): number {
  if (target <= pet.level) return 0;
  let needed = -pet.xp;
  for (let level = pet.level; level < Math.min(MAX_LEVEL, target); level++)
    needed += xpNeeded(level);
  return Math.max(0, needed);
}
