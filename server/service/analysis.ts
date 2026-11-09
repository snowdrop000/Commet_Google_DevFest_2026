import { createHash } from "node:crypto";
import type { z } from "zod";
import { evaluate } from "../../shared/evaluation";
import { demoCandidate } from "../../shared/demo";
import {
  analyzeRequest,
  analysisResult,
  type Analysis,
  type AnalyzeResponse,
  type Axes,
  type VideoSummary,
} from "../../shared/model";
import { ServiceError } from "../model/state";
import type { AiRepository } from "../repository/gemini";
import { RequestCache } from "./cache";
import { dayJst, type GameService } from "./game";

export type GeminiQuota = { reserve(uid: string, day: string): Promise<boolean> };
type Preview = Omit<AnalyzeResponse, "analysisId">;

export class AnalysisService {
  private readonly previews = new RequestCache<Preview>(45_000, 100);
  private readonly videos = new RequestCache<VideoSummary | null>(
    (summary) => (summary ? 7 * 86_400_000 : 60_000),
    20,
  );

  constructor(
    private readonly ai: AiRepository | null,
    private readonly quota: GeminiQuota,
    private readonly game: GameService,
    private readonly demo: boolean,
  ) {}

  async analyze(uid: string, input: z.output<typeof analyzeRequest>): Promise<AnalyzeResponse> {
    const { sessionId, ...draft } = input;
    const key = createHash("sha256")
      .update(JSON.stringify([uid, draft]))
      .digest("hex");
    const preview = await this.previews.load(key, () => this.evaluate(uid, draft));
    const analysisId = sessionId
      ? await this.game.issueReceipt(uid, sessionId, preview.analysis)
      : null;
    return { ...preview, analysisId };
  }

  private async evaluate(
    uid: string,
    draft: Omit<z.output<typeof analyzeRequest>, "sessionId">,
  ): Promise<Preview> {
    const deadline = Date.now() + 25_000;
    const timeout = (limit: number) => {
      const remaining = Math.min(limit, deadline - Date.now());
      if (remaining <= 0) throw new ServiceError(503, "Geminiの判定を取得できませんでした。");
      return remaining;
    };
    const ai = this.ai;
    if (!ai && !this.demo)
      throw new ServiceError(503, "サーバーでGEMINI_API_KEYを設定してください。");
    const { context, text } = draft;
    const { videoId, ...metadata } = context.content ?? {};
    let videoSource: Preview["videoSource"] =
      context.platform === "youtube" && (metadata.title || metadata.description)
        ? "page_metadata"
        : "none";
    let videoSummary: VideoSummary | undefined;
    const reserve = () => this.quota.reserve(uid, dayJst(Date.now()));
    if (ai && !(await reserve())) throw new ServiceError(429, "本日のGemini利用上限に達しました。");
    if (ai && context.platform === "youtube" && videoId && draft.summarizeVideos) {
      try {
        const summary = await this.videos.load(videoId, async () => {
          if (!(await reserve())) throw new ServiceError(429, "動画要約の上限に達しました。");
          try {
            return await ai.video(videoId, timeout(10_000));
          } catch (error) {
            if (!(error instanceof ServiceError) || error.status !== 503) throw error;
            return null;
          }
        });
        if (summary) {
          videoSummary = summary;
          videoSource = "gemini_video";
        }
      } catch (error) {
        if (!(error instanceof ServiceError) || error.status !== 429) throw error;
        // コメント判定用に確保した枠で、動画のメタデータを使って続ける。
      }
    }
    const axes = ai
      ? await ai.comment(
          {
            draft: text,
            platform: context.platform,
            reply_context: context.reply,
            content_context: { ...metadata, videoSummary },
          },
          timeout(20_000),
        )
      : demoCandidate(text);
    return {
      analysis: classify(
        axes,
        text,
        context.reply?.isReply === true && !context.reply.parentText,
        context.reply?.isReply === true,
      ),
      demo: !ai,
      videoSource,
    };
  }
}

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
