import { GoogleAuth } from "google-auth-library";
import { GeminiRepository } from "./gemini";

type TokenProvider = { getAccessToken(): Promise<string | null> };

export class VertexGeminiRepository extends GeminiRepository {
  constructor(projectId: string, location: string, model: string, auth?: TokenProvider) {
    if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) || projectId.startsWith("demo-")) {
      throw new Error("Vertex AI用の実際のGoogle CloudプロジェクトIDを設定してください。");
    }
    if (!/^(global|us|eu|[a-z]+-[a-z]+[0-9]+)$/.test(location)) {
      throw new Error("GOOGLE_CLOUD_LOCATIONの形式を確認してください。");
    }
    if (!/^gemini-[a-zA-Z0-9.-]+$/.test(model))
      throw new Error("GEMINI_MODELの形式を確認してください。");
    const tokenProvider =
      auth ??
      new GoogleAuth({
        projectId,
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      });
    const host =
      location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
    super(
      {
        endpoint: `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`,
        headers: async () => {
          const token = await tokenProvider.getAccessToken();
          if (!token) throw new Error("Google Cloudの認証情報を取得できませんでした。");
          return { Authorization: `Bearer ${token}`, "x-goog-user-project": projectId };
        },
      },
      model,
    );
  }
}
