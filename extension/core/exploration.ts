import { browser } from "wxt/browser";
import type { User } from "firebase/auth/web-extension";
import { z } from "zod";
import { profile } from "../../shared/game";
import {
  analyzeResponse,
  coinBalance,
  settlementResult,
  type Settlement,
  type AnalyzeRequest,
  type AnalyzeResponse,
} from "../../shared/model";
import { api, ApiError } from "./api";

type Page = { id: string; pageId: string; pending: number; postId?: string };
type Post = Page & { tabId: number; started: number };
type Exploration = {
  browserId: string;
  tabs: Record<number, Page>;
  posts: Record<string, Post>;
  outbox: Settlement[];
};

const prepareResult = z.object({ ok: z.literal(true) });
let writes = Promise.resolve();

function withState<T>(
  user: User,
  update: (state: Exploration, save: () => Promise<void>) => Promise<T>,
): Promise<T> {
  const job = writes.then(async () => {
    const session = await browser.storage.session.get("commetBrowserId");
    const browserId =
      typeof session.commetBrowserId === "string" ? session.commetBrowserId : crypto.randomUUID();
    if (!session.commetBrowserId) await browser.storage.session.set({ commetBrowserId: browserId });
    const key = `commetExploration:${user.uid}`;
    const stored = await browser.storage.local.get(key);
    const state: Exploration = (stored[key] as Exploration | undefined) || {
      browserId,
      tabs: {},
      posts: {},
      outbox: [],
    };
    if (state.browserId !== browserId) {
      for (const page of Object.values(state.tabs)) queue(state, page);
      for (const post of Object.values(state.posts)) queue(state, post);
      state.tabs = {};
      state.posts = {};
      state.browserId = browserId;
    }
    for (const [id, post] of Object.entries(state.posts)) {
      if (Date.now() - post.started < 60_000) continue;
      queue(state, post);
      delete state.posts[id];
      if (state.tabs[post.tabId]?.id === post.id) delete state.tabs[post.tabId];
    }
    const save = () => browser.storage.local.set({ [key]: state });
    await save();
    return update(state, save);
  });
  writes = job.then(
    () => {},
    () => {},
  );
  return job;
}

function queue(
  state: Exploration,
  page: Page,
  outcome: Settlement["outcome"] = { kind: page.postId ? "unverified" : "closed" },
) {
  if (!state.outbox.some((item) => item.sessionId === page.id))
    state.outbox.push({ sessionId: page.id, outcome });
}

function pageFor(state: Exploration, tabId: number, pageId: string) {
  const previous = state.tabs[tabId];
  if (previous?.pageId === pageId) return previous;
  if (previous && !previous.postId) queue(state, previous);
  const page: Page = { id: crypto.randomUUID(), pageId, pending: 0 };
  state.tabs[tabId] = page;
  return page;
}

async function flush(user: User, state: Exploration, save: () => Promise<void>, priority?: string) {
  const first = state.outbox.find((item) => item.sessionId === priority);
  const items = [
    first,
    ...state.outbox.filter((item) => item !== first).slice(0, first ? 2 : 3),
  ].filter((item) => item !== undefined);
  let settlement: z.infer<typeof settlementResult> | null = null;
  for (const item of items) {
    try {
      const result = await api("/v1/coins/settle", settlementResult, user, item);
      state.outbox = state.outbox.filter((candidate) => candidate.sessionId !== item.sessionId);
      await save();
      if (item.sessionId === priority) settlement = result;
      if (result.status === "settled")
        await browser.storage.local.set({ commetProfileRevision: crypto.randomUUID() });
    } catch (error) {
      // Transport or server errors leave the same idempotent event on disk.
      if (!(error instanceof ApiError) || error.status !== 400) break;
      state.outbox = state.outbox.filter((candidate) => candidate.sessionId !== item.sessionId);
      await save();
    }
  }
  return settlement;
}

export function tick(user: User, tabId: number, pageId: string, active: boolean) {
  return withState(user, async (state, save) => {
    const page = pageFor(state, tabId, pageId);
    await save();
    await flush(user, state, save);
    if (page.postId) {
      const pet = await api("/v1/profile", profile, user);
      return {
        pending: page.pending,
        confirmed: pet.confirmedCoins,
        picked: false,
        limited: false,
      };
    }
    const balance = await api("/v1/coins/tick", coinBalance, user, { sessionId: page.id, active });
    page.pending = balance.pending;
    await save();
    return balance;
  });
}

export function beginPost(user: User, tabId: number, pageId: string, postId: string) {
  return withState(user, async (state, save) => {
    const page = pageFor(state, tabId, pageId);
    if (page.postId) throw new Error("直前の投稿を確認しています。");
    page.postId = postId;
    state.posts[postId] = { ...page, tabId, started: Date.now() };
    await save();
    await api("/v1/coins/prepare", prepareResult, user, { sessionId: page.id });
    return null;
  });
}

export async function finishPost(
  user: User,
  tabId: number,
  pageId: string,
  postId: string,
  draft?: AnalyzeRequest,
) {
  const post = await withState(user, async (state) => state.posts[postId]);
  if (post?.tabId !== tabId || post.pageId !== pageId)
    throw new Error("精算対象の投稿がありません。");
  let analysis: AnalyzeResponse | null = null;
  let failure: unknown = null;
  if (draft) {
    try {
      analysis = await api("/v1/analyze", analyzeResponse, user, { ...draft, sessionId: post.id });
    } catch (error) {
      failure = error;
    }
  }
  const result = await withState(user, async (state, save) => {
    queue(
      state,
      post,
      analysis?.analysisId
        ? { kind: "posted", analysisId: analysis.analysisId }
        : { kind: "unverified" },
    );
    delete state.posts[postId];
    if (state.tabs[tabId]?.id === post.id) delete state.tabs[tabId];
    await save();
    return flush(user, state, save, post.id);
  });
  if (failure) throw failure;
  return { result, analysis, profile: result ? await api("/v1/profile", profile, user) : null };
}

export function closePage(user: User, tabId: number, pageId?: string) {
  return withState(user, async (state, save) => {
    const page = state.tabs[tabId];
    if (page && (!pageId || page.pageId === pageId)) {
      if (!page.postId) queue(state, page);
      delete state.tabs[tabId];
      await save();
    }
    await flush(user, state, save);
    return null;
  });
}

export function recover(user: User) {
  return withState(user, (state, save) => flush(user, state, save));
}
