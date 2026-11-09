import type { User } from "firebase/auth/web-extension";
import { z } from "zod";
import { resolveApiBase } from "../../shared/api-config";
import { requestTimeouts } from "../../shared/request-timeouts";
import { browser } from "wxt/browser";

export const apiBase = resolveApiBase(
  import.meta.env.WXT_API_BASE_URL,
  import.meta.env.WXT_FIREBASE_PROJECT_ID,
);
export const healthSchema = z.object({ ok: z.literal(true), mode: z.string() });

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  user?: User,
  body?: unknown,
  method = body ? "POST" : "GET",
): Promise<T> {
  const token = user ? await user.getIdToken() : null;
  // Chrome can suspend MV3 workers while a long video analysis is waiting.
  // Keep the worker active only for this bounded request, then stop the timer.
  const keepAlive =
    path === "/v1/analyze"
      ? setInterval(() => {
          void browser.runtime.getPlatformInfo().catch(() => {});
        }, 20_000)
      : undefined;
  try {
    let response: Response;
    try {
      response = await fetch(apiBase + path, {
        method,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(
          path === "/v1/analyze" ? requestTimeouts.analysis : requestTimeouts.api,
        ),
      });
    } catch {
      throw new ApiError("APIに接続できませんでした。接続先とネットワークを確認してください。", 0);
    }
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const error = z.object({ error: z.string() }).safeParse(data);
      throw new ApiError(
        error.success ? error.data.error : "APIの処理に失敗しました。",
        response.status,
      );
    }
    return schema.parse(data);
  } finally {
    if (keepAlive !== undefined) clearInterval(keepAlive);
  }
}
