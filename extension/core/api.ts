import type { User } from "firebase/auth/web-extension";
import { z } from "zod";

export const apiBase = "http://127.0.0.1:8765";
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
  let response: Response;
  try {
    response = await fetch(apiBase + path, {
      method,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(path === "/v1/analyze" ? 28_000 : 5_000),
    });
  } catch {
    throw new ApiError("localhost のHono APIに接続できませんでした。", 0);
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
}
