import {
  CATEGORY_RULES,
  ITEM_CATALOG,
  MAX_LEVEL,
  MAX_STAT,
  statKeys,
  xpNeeded,
  type Profile,
} from "../../shared/game";
import { contributionKeys } from "../../shared/model";
import { rewardsFor } from "../../shared/evaluation";
import type { GrowthEvidence } from "../model/state";
import { dayJst } from "./exchange-shop";

export function currentStreak(pet: Pick<Profile, "streak" | "lastActiveDate">, now: number) {
  return pet.lastActiveDate === dayJst(now) || pet.lastActiveDate === dayJst(now - 86_400_000)
    ? pet.streak
    : 0;
}

export function applyGrowth(pet: Profile, analysis: GrowthEvidence, now: number) {
  const rule = CATEGORY_RULES[analysis.category];
  const clamp = (value: number) => Math.min(MAX_STAT, Math.max(0, value));
  const { contributions, tendencies, bonusCarry } = pet.growth;
  if (analysis.decision === "safe") {
    for (const key of contributionKeys) contributions[key] += analysis[key];
    tendencies.empathy += analysis.appreciation;
    // Take max per post, not max of lifetime totals: the two kinds of wisdom can alternate.
    tendencies.criticalThinking += Math.max(analysis.constructiveness, analysis.information);
    tendencies.resilience += analysis.humor;
    if (analysis.appreciation > 0) pet.progress.supportive++;
    if (analysis.constructiveness > 0) pet.progress.constructive++;
    pet.progress.respectful++;
    if (analysis.isReply && analysis.contextSufficient) pet.progress.contextual++;
    if (analysis.appreciation > 0 && analysis.constructiveness > 0) pet.progress.balanced++;
  }
  const oldLevel = pet.level;
  if (pet.level < MAX_LEVEL) pet.xp += rewardsFor(analysis.decision, analysis.Q).xp;
  while (pet.level < MAX_LEVEL && pet.xp >= xpNeeded(pet.level)) {
    pet.xp -= xpNeeded(pet.level);
    pet.level++;
    for (const key of statKeys) pet[key] = clamp(pet[key] + 2);
    const total = statKeys.reduce((sum, key) => sum + tendencies[key], 0);
    if (total > 0) {
      for (const key of statKeys) bonusCarry[key] += (3 * tendencies[key]) / total;
      // Carry fractional allocations forward; displayed abilities always stay integers.
      for (let point = 0; point < 3; point++) {
        const key = statKeys.reduce((best, candidate) =>
          bonusCarry[candidate] > bonusCarry[best] ? candidate : best,
        );
        pet[key] = clamp(pet[key] + 1);
        bonusCarry[key] -= 1;
      }
    }
  }
  if (pet.level === MAX_LEVEL) pet.xp = 0;
  for (const [id, { requirement }] of Object.entries(ITEM_CATALOG)) {
    if (pet.unlockedItems.includes(id) || !requirement) continue;
    const eligible =
      requirement.type === "level"
        ? pet.level >= requirement.value
        : requirement.type === "stat"
          ? pet[requirement.key] >= requirement.value
          : requirement.type === "progress"
            ? pet.progress[requirement.key] >= requirement.value
            : statKeys.every((key) => pet[key] >= requirement.value);
    if (eligible) pet.unlockedItems.push(id);
  }
  const day = dayJst(now);
  if (pet.lastActiveDate !== day) {
    pet.streak = currentStreak(pet, now) + 1;
    pet.lastActiveDate = day;
  }
  pet.totalPosts++;
  pet.mood = oldLevel < pet.level ? "levelup" : rule.mood;
}
