import { CATEGORY_RULES, ITEM_CATALOG, statKeys, xpNeeded, type Profile } from "../../shared/game";
import type { GrowthEvidence } from "../model/state";

export function applyGrowth(pet: Profile, analysis: GrowthEvidence, now: number) {
  if (analysis.category === "context_required" || analysis.confidence <= 4) return;
  const rule = CATEGORY_RULES[analysis.category];
  const multiplier = analysis.confidence >= 8 ? 1 : 0.75;
  const scaled = (amount: number) => Math.round(amount * multiplier);
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  for (const key of statKeys) pet[key] = clamp(pet[key] + scaled(rule.deltas[key]));
  pet.xp += scaled(rule.deltas.xp);
  const oldLevel = pet.level;
  while (pet.level < 99 && pet.xp >= xpNeeded(pet.level)) {
    pet.xp -= xpNeeded(pet.level);
    pet.level++;
    for (const key of statKeys) pet[key] = clamp(pet[key] + 2);
  }
  if (analysis.confidence >= 6) {
    const mild = analysis.harm.severity <= 2;
    const respect = analysis.dialogueStyle.respect;
    if (mild && analysis.category === "supportive") pet.progress.supportive++;
    if (mild && analysis.category === "constructive_criticism") pet.progress.constructive++;
    if (mild && respect >= 8) pet.progress.respectful++;
    if (
      analysis.context.quality !== "insufficient" &&
      !["not_reply", "unclear"].includes(analysis.context.replyRelation)
    ) {
      pet.progress.contextual++;
    }
    if (mild && respect >= 6 && analysis.constructivenessScore >= 6 && analysis.empathyScore >= 6) {
      pet.progress.balanced++;
    }
  }
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
  const day = new Date(now).toISOString().slice(0, 10);
  const yesterday = new Date(now - 86_400_000).toISOString().slice(0, 10);
  if (pet.lastActiveDate !== day) {
    pet.streak = pet.lastActiveDate === yesterday ? pet.streak + 1 : 1;
    pet.lastActiveDate = day;
  }
  pet.totalPosts++;
  pet.mood = oldLevel < pet.level ? "levelup" : rule.mood;
}
