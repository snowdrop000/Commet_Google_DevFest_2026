(function (root) {
  "use strict";

  function analyzeText(rawText, rawContext) {
    const text = String(rawText || "").replace(/\s+/g, " ").trim().slice(0, 5000);
    const context = normalizeContext(rawContext);
    const abusive = /(死ね|消えろ|バカ|馬鹿|クズ|ゴミ|無能|キモい|きもい|黙れ|頭が悪い|発信するな|動画を出すな)/i.test(text);
    const criticism = /(問題|改善|良くない|よくない|反対|不足|足りない|間違|課題|懸念|分かりにく|わかりにく|もっと|もう少し|してほしい)/.test(text);
    const constructive = criticism && /(なぜなら|理由|たとえば|例えば|提案|すると良い|するとよい|してほしい|加える|具体的|改善案)/.test(text);
    const supportive = /(ありがとう|感謝|応援|すごい|素敵|おめでとう|助かった|がんば|頑張|参考にな|分かりやす|わかりやす|丁寧|楽しみに)/.test(text);
    const insufficient = context.reply.isReply && !context.reply.parentText;
    const purpose = constructive ? "proposal" : criticism ? "disagreement" : supportive ? "encouragement" : "information";
    const severity = abusive ? 9 : criticism && !constructive ? 3 : 0;
    const respect = abusive ? 1 : criticism && !constructive ? 4 : 8;
    const constructiveness = constructive ? 8 : criticism ? 3 : 5;
    const empathy = supportive ? 9 : abusive ? 1 : 5;
    const constructivenessScore = Math.round((constructiveness + (constructive ? 7 : 2) + (constructive ? 9 : 2) + (constructive ? 8 : 2)) / 4);
    const empathyScore = Math.round((empathy + (supportive ? 9 : 2) + (supportive ? 8 : 1)) / 3);
    const category = insufficient
      ? "context_required"
      : abusive
        ? "abusive"
        : constructive
          ? "constructive_criticism"
          : criticism
            ? "unconstructive_criticism"
            : supportive
              ? "supportive"
              : "neutral";

    return {
      discoursePurpose: { primary: purpose, secondary: [] },
      harm: {
        severity,
        labels: abusive ? ["insult", "personal_attack"] : [],
        target: abusive ? "individual" : "none"
      },
      dialogueStyle: {
        respect,
        hostility: abusive ? 9 : severity,
        openness: constructive ? 8 : 5,
        generalization: 1
      },
      constructiveness: {
        specificity: constructiveness,
        evidence: constructive ? 7 : 2,
        solutionOrientation: constructive ? 9 : 2,
        actionability: constructive ? 8 : 2
      },
      prosocial: {
        empathy,
        support: supportive ? 9 : 2,
        appreciation: supportive ? 8 : 1
      },
      context: {
        quality: insufficient ? "insufficient" : context.reply.parentText || context.content.videoSummary ? "full" : "partial",
        replyRelation: context.reply.isReply ? "unclear" : "not_reply",
        contentRelation: context.content.videoId ? "on_topic" : "not_applicable"
      },
      confidence: insufficient ? 3 : abusive ? 9 : 7,
      reason: insufficient
        ? "返信元が取得できないため、文脈を含めた判定を保留しました。"
        : abusive
          ? "相手の人格を傷つける可能性が高い言葉が含まれています。"
          : constructive
            ? "問題点に加えて理由や改善の方向性が示されています。"
            : criticism
              ? "問題の指摘はありますが、理由や改善案を足すと伝わりやすくなります。"
              : supportive
                ? "感謝や応援の気持ちが伝わる表現です。"
                : "強い攻撃性は見られない、日常的または中立的な投稿です。",
      suggestion: abusive
        ? "相手ではなく、気になった行動や事実を具体的に伝えてみましょう。"
        : criticism && !constructive
          ? `${text} 理由と、改善できそうな点も具体的に伝えたいです。`
          : text,
      rationaleSpans: abusive
        ? [text.match(/死ね|消えろ|バカ|馬鹿|クズ|ゴミ|無能|キモい|きもい|黙れ|頭が悪い|発信するな|動画を出すな/i)?.[0] || ""]
        : [],
      constructivenessScore,
      empathyScore,
      toxicity: severity,
      category
    };
  }

  function normalizeContext(value) {
    return {
      reply: {
        isReply: Boolean(value?.reply?.isReply),
        parentText: String(value?.reply?.parentText || "").trim()
      },
      content: {
        videoId: String(value?.content?.videoId || "").trim(),
        videoSummary: String(value?.content?.videoSummary || "").trim()
      }
    };
  }

  root.KokoroDemo = Object.freeze({ analyzeText });
})(typeof globalThis !== "undefined" ? globalThis : this);
