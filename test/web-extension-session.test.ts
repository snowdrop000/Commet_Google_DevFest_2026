import { describe, expect, it, vi } from "vitest";
import { WebExtensionSession } from "../web/extension-session";
import { DemoStore } from "../web/model";
import { classify } from "../shared/classification";
import { demoCandidate } from "../shared/demo";
import { defaults } from "../shared/preferences";
import type { AnalyzeRequest, AnalyzeResponse } from "../shared/model";

const draft = {
  text: "参考になりました。ありがとうございます！",
  context: { platform: "youtube" as const },
  summarizeVideos: true,
};
const analyzed: AnalyzeResponse = {
  analysis: classify(demoCandidate(draft.text), draft.text),
  analysisId: null,
  demo: false,
  videoSource: "none",
};

describe("actual extension message protocol in the Web demo", () => {
  it("previews without growth, shares authenticated analysis with posting and settles once", async () => {
    const store = new DemoStore();
    const analyze = vi.fn<(input: AnalyzeRequest) => Promise<AnalyzeResponse>>(async () => analyzed);
    let now = Date.now();
    const session = new WebExtensionSession(store, { analyze, clock: () => now });
    expect(() => session.setMode("gemini")).toThrow("ログイン");
    session.setGoogleSignedIn(true);
    session.setMode("gemini");
    await session.dispatch({ type: "preview", draft });
    expect(store.getSnapshot().profile.totalPosts).toBe(0);
    expect(analyze).toHaveBeenCalledTimes(1);
    await session.dispatch({ type: "tick", pageId: "page", active: true });
    now += 15_000;
    await session.dispatch({ type: "tick", pageId: "page", active: true });
    await session.dispatch({ type: "beginPost", pageId: "page", postId: "post" });
    const input = { type: "finishPost", pageId: "page", postId: "post", draft } as const;
    const result = await session.dispatch(input);
    expect(await session.dispatch(input)).toEqual(result);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().profile.totalPosts).toBe(1);
    expect(store.getSnapshot().profile.confirmedCoins).toBe(
      30 + Math.floor(analyzed.analysis.coinMultiplier),
    );
    await session.dispatch({ type: "leave", pageId: "page" });
    expect(store.getSnapshot().profile.confirmedCoins).toBe(
      30 + Math.floor(analyzed.analysis.coinMultiplier),
    );
    expect(analyze.mock.calls[0][0]).not.toHaveProperty("sessionId");
  });
  it("does not award growth when submission cannot be confirmed, and credits unspent browsing once", async () => {
    const store = new DemoStore();
    let now = Date.now();
    const session = new WebExtensionSession(store, { clock: () => now });
    await session.dispatch({ type: "tick", pageId: "page", active: true });
    now += 15_000;
    await session.dispatch({ type: "tick", pageId: "page", active: true });
    await session.dispatch({ type: "beginPost", pageId: "page", postId: "post" });
    await session.dispatch({ type: "finishPost", pageId: "page", postId: "post" });
    expect(store.getSnapshot().profile.totalPosts).toBe(0);
    session.closePages();
    session.closePages();
    expect(store.getSnapshot().profile.confirmedCoins).toBe(31);
  });
  it("aborts a stale Gemini request when the mode changes and rejects its late answer", async () => {
    const store = new DemoStore();
    let resolve!: (value: AnalyzeResponse) => void;
    let signal!: AbortSignal;
    const session = new WebExtensionSession(store, {
      analyze: (_draft, abort) => {
        signal = abort;
        return new Promise<AnalyzeResponse>((done) => {
          resolve = done;
        });
      },
    });
    session.setGoogleSignedIn(true);
    session.setMode("gemini");
    const pending = session.dispatch({ type: "preview", draft });
    session.setMode("sample");
    expect(signal.aborted).toBe(true);
    resolve(analyzed);
    await expect(pending).rejects.toThrow("判定方法");
    expect(store.getSnapshot().profile.totalPosts).toBe(0);
  });
  it("persists preferences and notifies the real Overlay without modifying extension data", async () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
    };
    const session = new WebExtensionSession(new DemoStore(storage), { storage });
    const changed = vi.fn();
    session.addStorageListener(changed);
    await session.dispatch({
      type: "preferences",
      settings: { ...defaults, followComposer: false },
    });
    expect(changed).toHaveBeenCalledWith(
      expect.objectContaining({ commetPreferences: expect.anything() }),
      "local",
    );
    expect(
      new WebExtensionSession(new DemoStore(storage), { storage }).state().settings.followComposer,
    ).toBe(false);
    expect([...memory.keys()].every((key) => key.startsWith("commet.web-demo."))).toBe(true);
  });
});
