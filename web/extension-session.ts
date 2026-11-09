import { classify } from "../shared/classification";
import { demoCandidate } from "../shared/demo";
import { defaults, preferences, type Preferences } from "../shared/preferences";
import { analyzeRequest, type AnalyzeRequest, type AnalyzeResponse } from "../shared/model";
import { dayJst } from "../shared/day";
import type { Message, Results, State } from "../extension/core/messages";
import { DemoStore } from "./model";

type LocalStorage = Pick<Storage, "getItem" | "setItem">;
type StorageListener = (changes: Record<string, unknown>, area: string) => void;
type PageSession = {
  pending: number;
  last: number;
  active: boolean;
  closing: boolean;
  posts: Set<string>;
};
const preferencesKey = "commet.web-demo.preferences.v1";

/** Implements the actual extension's message protocol using isolated demo state. */
export class WebExtensionSession {
  private info = {
    mode: "sample" as "sample" | "gemini",
    googleSignedIn: false,
    demoSignedIn: false,
    generation: 0,
  };
  private settings: Preferences = defaults;
  private listeners = new Set<() => void>();
  private storageListeners = new Set<StorageListener>();
  private pages = new Map<string, PageSession>();
  private finished = new Map<string, Promise<Results["finishPost"]>>();
  private requests = new Set<AbortController>();
  private cached: { key: string; until: number; value: Promise<AnalyzeResponse> } | null = null;
  private collected = { day: "", count: 0 };
  constructor(
    readonly store: DemoStore,
    private readonly options: {
      storage?: LocalStorage;
      clock?: () => number;
      analyze?: (input: AnalyzeRequest, signal: AbortSignal) => Promise<AnalyzeResponse>;
      login?: () => Promise<void>;
      logout?: () => Promise<void>;
    } = {},
  ) {
    try {
      this.settings = preferences.parse(
        JSON.parse(options.storage?.getItem(preferencesKey) || "{}"),
      );
    } catch {
      /* defaults */
    }
    store.subscribe(() => this.changed("commetProfileRevision"));
  }
  getSnapshot = () => this.info;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  addStorageListener = (listener: StorageListener) => {
    this.storageListeners.add(listener);
  };
  removeStorageListener = (listener: StorageListener) => {
    this.storageListeners.delete(listener);
  };
  private now() {
    return (this.options.clock ?? Date.now)();
  }
  private changed(key: string) {
    this.storageListeners.forEach((listener) =>
      listener({ [key]: { newValue: crypto.randomUUID() } }, "local"),
    );
  }
  private invalidate() {
    for (const request of this.requests) request.abort();
    this.requests.clear();
    this.cached = null;
    this.info = { ...this.info, generation: this.info.generation + 1 };
    this.listeners.forEach((listener) => listener());
    this.changed("commetAuthRevision");
  }
  setGoogleSignedIn(signedIn: boolean) {
    this.setAuthentication(signedIn ? "google" : null);
  }
  setAuthentication(kind: "google" | "demo" | null) {
    if (
      this.info.googleSignedIn === (kind === "google") &&
      this.info.demoSignedIn === (kind === "demo")
    )
      return;
    this.info = {
      ...this.info,
      googleSignedIn: kind === "google",
      demoSignedIn: kind === "demo",
      mode: kind ? "gemini" : "sample",
    };
    this.invalidate();
  }
  setMode(mode: "sample" | "gemini") {
    if (mode === "gemini" && !this.info.googleSignedIn && !this.info.demoSignedIn)
      throw new Error("Gemini判定にはログインが必要です。");
    if (mode === this.info.mode) return;
    this.info = { ...this.info, mode };
    this.invalidate();
  }
  state(): State {
    // Demo operations are always available; webDemo separately reports real Google authentication.
    return {
      signedIn: true,
      emulator: false,
      settings: this.settings,
      profile: this.store.getSnapshot().profile,
      webDemo: {
        googleSignedIn: this.info.googleSignedIn,
        demoSignedIn: this.info.demoSignedIn,
        aiMode: this.info.mode,
      },
    };
  }
  reset() {
    this.pages.clear();
    this.finished.clear();
    this.collected = { day: "", count: 0 };
    this.store.reset();
    this.settings = { ...defaults };
    try {
      this.options.storage?.setItem(preferencesKey, JSON.stringify(this.settings));
    } catch {
      /* memory fallback */
    }
    this.invalidate();
    this.changed("commetPreferences");
  }
  private async preview(input: Omit<AnalyzeRequest, "sessionId">) {
    const draft = analyzeRequest.omit({ sessionId: true }).parse(input);
    const key = JSON.stringify([this.info.generation, this.info.mode, draft]);
    if (this.cached?.key === key && this.cached.until > this.now()) return this.cached.value;
    const mode = this.info.mode,
      generation = this.info.generation;
    const controller = new AbortController();
    this.requests.add(controller);
    const task = (async () => {
      try {
        const result =
          mode === "gemini"
            ? await this.options.analyze!(draft, controller.signal)
            : {
                analysis: classify(
                  demoCandidate(draft.text),
                  draft.text,
                  Boolean(draft.context.reply?.isReply && !draft.context.reply?.parentText),
                  Boolean(draft.context.reply?.isReply),
                ),
                analysisId: null,
                demo: true,
                videoSource: "none" as const,
              };
        if (generation !== this.info.generation || controller.signal.aborted)
          throw new Error("判定方法が変わりました。もう一度チェックしてください。");
        return result;
      } catch (error) {
        if (this.cached?.key === key) this.cached = null;
        throw error;
      } finally {
        this.requests.delete(controller);
      }
    })();
    this.cached = { key, until: this.now() + 45_000, value: task };
    return task;
  }
  private page(id: string) {
    let session = this.pages.get(id);
    if (!session) {
      if (this.pages.size > 64) this.pages.delete(this.pages.keys().next().value!);
      session = { pending: 0, last: this.now(), active: false, closing: false, posts: new Set() };
      this.pages.set(id, session);
    }
    return session;
  }
  private close(id: string) {
    const page = this.pages.get(id);
    if (!page) return;
    if (page.posts.size) {
      page.closing = true;
      return;
    }
    this.store.creditCoins(page.pending);
    this.pages.delete(id);
  }
  closePages() {
    for (const id of this.pages.keys()) this.close(id);
  }
  async dispatch(input: Message): Promise<unknown> {
    switch (input.type) {
      case "state":
        return this.state();
      case "login":
        if (!this.info.googleSignedIn && !this.info.demoSignedIn) await this.options.login?.();
        if (this.info.googleSignedIn || this.info.demoSignedIn) this.setMode("gemini");
        return this.state();
      case "logout":
        await this.options.logout?.();
        this.setGoogleSignedIn(false);
        return this.state();
      case "preferences": {
        this.settings = preferences.parse(input.settings);
        try {
          this.options.storage?.setItem(preferencesKey, JSON.stringify(this.settings));
        } catch {
          /* memory fallback */
        }
        this.changed("commetPreferences");
        return this.settings;
      }
      case "appearance":
        this.store.saveAppearance(input.appearance);
        return this.store.getSnapshot().profile;
      case "preview":
        return this.preview(input.draft);
      case "tick": {
        const now = this.now(),
          day = dayJst(now),
          page = this.page(input.pageId);
        if (this.collected.day !== day) this.collected = { day, count: 0 };
        let picked = false;
        if (input.active && page.active && now - page.last >= 15_000 && this.collected.count < 60) {
          page.pending++;
          this.collected.count++;
          page.last = now;
          picked = true;
        }
        if (!input.active || !page.active) page.last = now;
        page.active = input.active;
        return {
          pending: page.pending,
          confirmed: this.store.getSnapshot().profile.confirmedCoins,
          picked,
          limited: this.collected.count >= 60,
        };
      }
      case "leave":
        this.close(input.pageId);
        return null;
      case "beginPost":
        this.page(input.pageId).posts.add(input.postId);
        return null;
      case "finishPost": {
        const key = input.pageId + ":" + input.postId;
        const previous = this.finished.get(key);
        if (previous) return previous;
        const page = this.page(input.pageId),
          generation = this.info.generation;
        if (!page.posts.has(input.postId)) throw new Error("投稿の開始を確認できませんでした。");
        const task = (async (): Promise<Results["finishPost"]> => {
          try {
            if (!input.draft)
              return {
                result: { status: "held", multiplier: null, awarded: 0, pending: page.pending },
                analysis: null,
                profile: this.store.getSnapshot().profile,
              };
            const analysis = await this.preview(input.draft);
            if (generation !== this.info.generation)
              throw new Error("体験データが変更されたため、育成は反映しませんでした。");
            const awarded = Math.floor(page.pending * analysis.analysis.coinMultiplier);
            this.store.post(analysis.analysis, key, page.pending);
            page.pending = 0;
            return {
              result: {
                status: "settled",
                multiplier: analysis.analysis.coinMultiplier,
                awarded,
                pending: 0,
              },
              analysis,
              profile: this.store.getSnapshot().profile,
            };
          } finally {
            page.posts.delete(input.postId);
            if (page.closing) this.close(input.pageId);
          }
        })();
        if (this.finished.size > 100) this.finished.delete(this.finished.keys().next().value!);
        this.finished.set(key, task);
        return task;
      }
      case "health": {
        const response = await fetch("/health");
        if (!response.ok) throw new Error("APIに接続できません。");
        return response.json();
      }
      default:
        return this.store.dispatch(input);
    }
  }
}
