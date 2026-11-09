import { z } from "zod";

export const category = z.enum([
  "abusive",
  "unconstructive_criticism",
  "constructive_criticism",
  "supportive",
  "neutral",
  "context_required",
]);
export const safetyKeys = [
  "personalAttack",
  "discrimination",
  "threatViolence",
  "harassment",
] as const;
export const contributionKeys = [
  "appreciation",
  "constructiveness",
  "information",
  "humor",
] as const;
const score = z.number().int().min(0).max(2);
export const decision = z.enum(["safe", "harmful", "needs_secondary_check"]);

// Gemini supplies observations only. S/Q and rewards are calculated by the server.
export const axes = z.strictObject({
  personalAttack: score,
  discrimination: score,
  threatViolence: score,
  harassment: score,
  appreciation: score,
  constructiveness: score,
  information: score,
  humor: score,
  safetyConfidence: z.number().int().min(0).max(10),
  target: z.enum([
    "person",
    "group",
    "attribute",
    "work",
    "opinion",
    "behavior",
    "self",
    "none",
    "unknown",
  ]),
  isQuotation: z.boolean(),
  contextSufficient: z.boolean(),
  isDirectAttack: z.boolean(),
  attackEvidence: z.array(z.string().min(1).max(200)).max(3),
  reason: z.string().min(1).max(1000),
  suggestion: z.string().max(280),
});
export const analysisResult = axes.extend({
  category,
  S: score,
  Q: score,
  decision,
  needsSecondaryCheck: z.boolean(),
  reviewReasons: z.array(z.string().max(80)).max(8),
  xp: z.union([z.literal(0), z.literal(2), z.literal(6), z.literal(10)]),
  coinMultiplier: z.union([z.literal(0), z.literal(1), z.literal(1.5)]),
  isReply: z.boolean(),
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
export const videoSummaryLimits = { summary: 700, items: 6, item: 160 } as const;
const summaryList = z.array(z.string().max(videoSummaryLimits.item)).max(videoSummaryLimits.items);
export const videoSummary = z.strictObject({
  summary: z.string().min(1).max(videoSummaryLimits.summary),
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
