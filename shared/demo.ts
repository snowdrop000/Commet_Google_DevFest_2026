import type { Axes } from "./model";

/** Offline fixtures only; this is not an alternative AI evaluator. */
export function demoCandidate(text: string): Axes {
  const abuse = text.match(
    /死ね|消えろ|バカ|馬鹿|クズ|ゴミ|無能|キモい|きもい|黙れ|頭が悪い|発信するな|動画を出すな/,
  );
  const criticism =
    /問題|改善|良くない|反対|不足|足りない|課題|分かりにく|わかりにく|もっと|もう少し|してほしい/.test(
      text,
    );
  const constructive =
    criticism && /理由|なぜなら|例えば|たとえば|提案|してほしい|具体|改善案/.test(text);
  const support =
    /ありがとう|感謝|応援|すごい|素敵|おめでとう|助かった|頑張|がんば|参考にな|丁寧/.test(text);
  return {
    personalAttack: abuse ? 2 : 0,
    discrimination: 0,
    threatViolence: 0,
    harassment: 0,
    appreciation: support ? 2 : 0,
    constructiveness: constructive ? 2 : criticism ? 1 : 0,
    information: /[?？]/.test(text) ? 1 : 0,
    humor: 0,
    safetyConfidence: 9,
    target: abuse ? "person" : "none",
    isQuotation: false,
    contextSufficient: true,
    isDirectAttack: Boolean(abuse),
    attackEvidence: abuse ? [abuse[0]] : [],
    reason: abuse
      ? "相手の人格を傷つける可能性が高い表現があります。"
      : support
        ? "感謝や応援の気持ちが伝わります。"
        : constructive
          ? "指摘に加えて、改善の方向性が示されています。"
          : "強い攻撃性は見られませんでした。",
    suggestion: abuse
      ? "相手の人格に触れず、気になった行動や事実を具体的に伝えてみましょう。"
      : criticism && !constructive
        ? "どの部分が気になったかと、その理由を具体的に伝えてみましょう。"
        : "",
  };
}
