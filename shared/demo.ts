import type { Axes } from "./model";

export function demoCandidate(text: string): Axes {
  const abuse = text.match(
    /死ね|消えろ|バカ|馬鹿|クズ|ゴミ|無能|キモい|きもい|黙れ|頭が悪い|発信するな|動画を出すな/,
  );
  const criticism =
    /問題|改善|良くない|よくない|反対|不足|足りない|間違|課題|懸念|分かりにく|わかりにく|もっと|もう少し|してほしい/.test(
      text,
    );
  const constructive =
    criticism && /理由|なぜなら|たとえば|例えば|提案|してほしい|加える|具体的|改善案/.test(text);
  const support =
    /ありがとう|感謝|応援|すごい|素敵|おめでとう|助かった|頑張|がんば|参考にな|丁寧/.test(text);
  return {
    discoursePurpose: {
      primary: abuse
        ? "other"
        : constructive
          ? "proposal"
          : criticism
            ? "disagreement"
            : support
              ? "encouragement"
              : "information",
      secondary: [],
    },
    harm: {
      severity: abuse ? 9 : criticism && !constructive ? 3 : 0,
      labels: abuse ? ["insult"] : [],
      target: abuse ? "individual" : "none",
    },
    dialogueStyle: {
      respect: abuse ? 1 : 8,
      hostility: abuse ? 9 : 0,
      openness: 5,
      generalization: 1,
    },
    constructiveness: {
      specificity: constructive ? 8 : 3,
      evidence: constructive ? 7 : 2,
      solutionOrientation: constructive ? 9 : 2,
      actionability: constructive ? 8 : 2,
    },
    prosocial: {
      empathy: support ? 9 : 5,
      support: support ? 9 : 2,
      appreciation: support ? 8 : 1,
    },
    context: { quality: "partial", replyRelation: "unclear", contentRelation: "cannot_determine" },
    confidence: 7,
    reason: abuse
      ? "相手の人格を傷つける可能性が高い表現があります。"
      : constructive
        ? "指摘に加えて、改善の方向性が示されています。"
        : criticism
          ? "理由や改善案を足すと伝わりやすくなります。"
          : support
            ? "感謝や応援の気持ちが伝わります。"
            : "強い攻撃性は見られませんでした。",
    suggestion: abuse
      ? "相手の人格に触れず、気になった行動や事実を具体的に伝えてみましょう。"
      : criticism && !constructive
        ? "どの部分が気になったかと、その理由を具体的に伝えてみましょう。"
        : "",
    rationaleSpans: abuse ? [abuse[0]] : [],
  };
}
