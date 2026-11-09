import { contributionKeys, safetyKeys, type Axes } from "./model";

export function rewardsFor(
  decision: "safe" | "harmful" | "needs_secondary_check",
  Q: number,
): { xp: number; coinMultiplier: 0 | 1 | 1.5 } {
  return {
    xp: decision === "harmful" ? 0 : decision === "safe" ? 2 + 4 * Q : 2,
    coinMultiplier: decision === "harmful" ? 0 : decision === "safe" && Q >= 1 ? 1.5 : 1,
  };
}

/** Provisional Gemini-only rules, matching the comment-evaluation experiment. */
export function evaluate(axes: Axes, text: string) {
  const S = 2 - Math.max(...safetyKeys.map((key) => axes[key]));
  const Q = Math.max(...contributionKeys.map((key) => axes[key]));
  const reviewReasons: string[] = [];
  if (!axes.contextSufficient) reviewReasons.push("insufficient_context");
  if (axes.safetyConfidence < 8) reviewReasons.push("low_confidence");
  if (S === 1) reviewReasons.push("ambiguous_safety");
  if (S === 0) {
    if (["none", "unknown"].includes(axes.target)) reviewReasons.push("unclear_target");
    if (!axes.isDirectAttack) reviewReasons.push("not_direct_attack");
    if (axes.isQuotation) reviewReasons.push("quotation_requires_review");
    if (!axes.attackEvidence.length || !axes.attackEvidence.every((span) => text.includes(span)))
      reviewReasons.push("unverified_attack_evidence");
  }
  const decision = reviewReasons.length ? "needs_secondary_check" : S === 2 ? "safe" : "harmful";
  return {
    S,
    Q,
    decision,
    needsSecondaryCheck: decision === "needs_secondary_check",
    reviewReasons,
    ...rewardsFor(decision, Q),
  };
}
