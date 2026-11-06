import { z } from "zod";

export const category = z.enum([
  "abusive",
  "unconstructive_criticism",
  "constructive_criticism",
  "supportive",
  "neutral",
  "context_required",
]);
const purpose = z.enum([
  "information",
  "question",
  "answer",
  "elaboration",
  "agreement",
  "disagreement",
  "proposal",
  "advice",
  "appreciation",
  "empathy",
  "encouragement",
  "humor",
  "emotional_reaction",
  "other",
]);
const score = z.number().int().min(0).max(10);
const harmLabel = z.enum([
  "personal_attack",
  "insult",
  "threat",
  "identity_hate",
  "violence_incitation",
  "sexual_harassment",
  "provocation",
  "exclusion",
  "profanity",
]);

export const axes = z.strictObject({
  discoursePurpose: z.strictObject({ primary: purpose, secondary: z.array(purpose).max(3) }),
  harm: z.strictObject({
    severity: score,
    labels: z.array(harmLabel).max(5),
    target: z.enum([
      "individual",
      "group",
      "organization",
      "work",
      "policy",
      "behavior",
      "self",
      "none",
      "unclear",
    ]),
  }),
  dialogueStyle: z.strictObject({
    respect: score,
    hostility: score,
    openness: score,
    generalization: score,
  }),
  constructiveness: z.strictObject({
    specificity: score,
    evidence: score,
    solutionOrientation: score,
    actionability: score,
  }),
  prosocial: z.strictObject({ empathy: score, support: score, appreciation: score }),
  context: z.strictObject({
    quality: z.enum(["full", "partial", "insufficient"]),
    replyRelation: z.enum([
      "not_reply",
      "agreement",
      "constructive_disagreement",
      "correction",
      "answer",
      "emotional_support",
      "elaboration",
      "negative_reaction",
      "mockery",
      "unclear",
    ]),
    contentRelation: z.enum([
      "not_applicable",
      "on_topic",
      "supports_content",
      "challenges_content",
      "adds_information",
      "unrelated",
      "cannot_determine",
    ]),
  }),
  confidence: score,
  reason: z.string().min(1).max(200),
  suggestion: z.string().max(280),
  rationaleSpans: z.array(z.string().max(80)).max(3),
});
export const analysisResult = axes.extend({
  category,
  constructivenessScore: score,
  empathyScore: score,
});
export type Analysis = z.infer<typeof analysisResult>;
export type Axes = z.infer<typeof axes>;
export type Category = z.infer<typeof category>;

const contextText = z.string().max(1200);
export const platform = z.enum(["x", "youtube"]);
export const sourceContext = z.strictObject({
  platform: platform.optional(),
  reply: z
    .strictObject({
      isReply: z.boolean(),
      parentText: contextText.optional(),
      threadRootText: contextText.optional(),
    })
    .optional(),
  content: z
    .strictObject({
      videoId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{11}$/)
        .optional(),
      title: z.string().max(300).optional(),
      description: contextText.optional(),
      sourceText: contextText.optional(),
    })
    .optional(),
});
export type SourceContext = z.infer<typeof sourceContext>;
export const analyzeRequest = z.strictObject({
  text: z.string().trim().min(2).max(5000),
  context: sourceContext.default({}),
  summarizeVideos: z.boolean().default(true),
  sessionId: z.uuid().optional(),
});
export type AnalyzeRequest = z.input<typeof analyzeRequest>;
export const analyzeResponse = z.strictObject({
  analysis: analysisResult,
  analysisId: z.uuid().nullable(),
  demo: z.boolean(),
  videoSource: z.enum(["none", "page_metadata", "gemini_video"]),
});
export type AnalyzeResponse = z.infer<typeof analyzeResponse>;
const summaryList = z.array(z.string().max(160)).max(6);
export const videoSummary = z.strictObject({
  summary: z.string().min(1).max(700),
  topics: summaryList,
  keyClaims: summaryList,
  sensitiveTopics: summaryList,
});
export type VideoSummary = z.infer<typeof videoSummary>;

export const coinTick = z.strictObject({ sessionId: z.uuid(), active: z.boolean() });
export const settlement = z.strictObject({
  sessionId: z.uuid(),
  outcome: z.discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("closed") }),
    z.strictObject({ kind: z.literal("unverified") }),
    z.strictObject({ kind: z.literal("posted"), analysisId: z.uuid() }),
  ]),
});
export type Settlement = z.infer<typeof settlement>;
export const coinBalance = z.strictObject({
  pending: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  picked: z.boolean(),
  limited: z.boolean(),
});
export const settlementResult = z.strictObject({
  status: z.enum(["settled", "held"]),
  multiplier: z.union([z.literal(0), z.literal(1), z.literal(1.5), z.null()]),
  awarded: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
});
export type SettlementResult = z.infer<typeof settlementResult>;
