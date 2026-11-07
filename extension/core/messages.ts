import { browser } from "wxt/browser";
import { z } from "zod";
import {
  analyzeRequest,
  coinBalance,
  settlementResult,
  type AnalyzeResponse,
} from "../../shared/model";
import { appearance, type Profile } from "../../shared/game";
import type { GachaResult } from "../../shared/gacha";

export const preferences = z.object({
  position: z
    .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    .nullable()
    .default(null),
  followComposer: z.boolean().default(true),
  explore: z.boolean().default(true),
  useContext: z.boolean().default(true),
  summarizeVideos: z.boolean().default(true),
  analyzeOnPost: z.boolean().default(true),
});
export type Preferences = z.infer<typeof preferences>;
export const defaults = preferences.parse({});
const pageId = z.uuid();
const postId = z.uuid();
export const message = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state") }),
  z.object({ type: z.literal("login") }),
  z.object({ type: z.literal("logout") }),
  z.object({ type: z.literal("health") }),
  z.object({ type: z.literal("gacha") }),
  z.object({ type: z.literal("gachaAck"), requestId: z.uuid() }),
  z.object({ type: z.literal("preferences"), settings: preferences }),
  z.object({ type: z.literal("appearance"), appearance }),
  z.object({ type: z.literal("preview"), draft: analyzeRequest.omit({ sessionId: true }) }),
  z.object({ type: z.literal("tick"), pageId, active: z.boolean() }),
  z.object({ type: z.literal("leave"), pageId }),
  z.object({ type: z.literal("beginPost"), pageId, postId }),
  z.object({
    type: z.literal("finishPost"),
    pageId,
    postId,
    draft: analyzeRequest.omit({ sessionId: true }).optional(),
  }),
]);
export type Message = z.infer<typeof message>;
export type State = {
  signedIn: boolean;
  emulator: boolean;
  settings: Preferences;
  profile: Profile | null;
};

type Results = {
  state: State;
  login: State;
  logout: State;
  health: { ok: true; mode: string };
  gacha: GachaResult;
  gachaAck: null;
  preferences: Preferences;
  appearance: Profile;
  preview: AnalyzeResponse;
  tick: z.infer<typeof coinBalance>;
  leave: null;
  beginPost: null;
  finishPost: {
    result: z.infer<typeof settlementResult> | null;
    analysis: AnalyzeResponse | null;
    profile: Profile | null;
  };
};

export async function send<M extends Message>(input: M): Promise<Results[M["type"]]> {
  const response:
    { ok: true; value: Results[M["type"]] } | { ok: false; error: string } | undefined =
    await browser.runtime.sendMessage(input);
  if (!response?.ok) throw new Error(response?.error || "拡張機能に接続できませんでした。");
  return response.value;
}
