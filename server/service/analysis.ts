import { createHash } from "node:crypto";
import type { z } from "zod";
import { classify } from "../../shared/classification";
export { classify } from "../../shared/classification";
import { demoCandidate } from "../../shared/demo";
import { analyzeRequest, type AnalyzeResponse, type VideoSummary } from "../../shared/model";
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
            return await ai.video(videoId);
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
      ? await ai.comment({
          draft: text,
          platform: context.platform,
          reply_context: context.reply,
          content_context: { ...metadata, videoSummary },
        })
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
