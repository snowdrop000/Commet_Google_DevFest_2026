import { evaluate } from "./evaluation";
import { analysisResult, type Analysis, type Axes } from "./model";

/** The same validated classification rules are used in the API and the web demo. */
export function classify(
  candidate: Axes,
  text: string,
  missingReply = false,
  isReply = false,
): Analysis {
  const axes = missingReply
    ? {
        ...candidate,
        contextSufficient: false,
        reason: "返信元が取得できないため、追加確認が必要です。",
      }
    : candidate;
  const reward = evaluate(axes, text);
  const category =
    reward.decision === "harmful"
      ? "abusive"
      : reward.needsSecondaryCheck
        ? "context_required"
        : axes.appreciation > 0 &&
            axes.appreciation >= Math.max(axes.constructiveness, axes.information, axes.humor)
          ? "supportive"
          : axes.constructiveness > 0 || axes.information > 0
            ? "constructive_criticism"
            : "neutral";
  return analysisResult.parse({
    ...axes,
    ...reward,
    category,
    isReply,
    suggestion: missingReply || reward.decision === "safe" ? "" : axes.suggestion,
  });
}
