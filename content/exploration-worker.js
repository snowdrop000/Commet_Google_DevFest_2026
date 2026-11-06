"use strict";

let explorationWrites = Promise.resolve();

async function commetApi(path, body, timeout = 2500, method = body ? "POST" : "GET") {
  let response;
  try {
    response = await fetch("http://127.0.0.1:8765" + path, {
      method,
      headers: { "X-Commet-Client": "extension", "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeout)
    });
  } catch (_error) {
    const error = new Error("CommetのPythonサーバーへ接続できませんでした。");
    error.offline = true;
    throw error;
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Commetの処理に失敗しました。");
  return data;
}

function withExploration(change) {
  const work = explorationWrites.then(async () => {
    const { exploration = { pages: {}, posts: {}, outbox: [] } } = await chrome.storage.local.get("exploration");
    exploration.posts ||= {};
    let { explorationBrowser } = await chrome.storage.session.get("explorationBrowser");
    if (!explorationBrowser || exploration.browser !== explorationBrowser) {
      for (const page of Object.values(exploration.pages)) queueSettlement(exploration, page);
      for (const page of Object.values(exploration.posts)) queueSettlement(exploration, page);
      exploration.pages = {};
      exploration.posts = {};
      explorationBrowser ||= crypto.randomUUID();
      exploration.browser = explorationBrowser;
      await chrome.storage.session.set({ explorationBrowser });
    }
    for (const [postId, page] of Object.entries(exploration.posts)) {
      if (Date.now() - page.attemptedAt > 60000) {
        queueSettlement(exploration, page);
        delete exploration.posts[postId];
        if (exploration.pages[page.tab]?.id === page.id) delete exploration.pages[page.tab];
      }
    }
    const save = () => chrome.storage.local.set({ exploration });
    await save();
    return change(exploration, save);
  });
  explorationWrites = work.catch(() => {});
  return work;
}

function queueSettlement(state, page, outcome = page.postId ? "unverified" : "closed", analysisId = null) {
  if (state.outbox.some((entry) => entry.session_id === page.id)) return;
  state.outbox.push({ session_id: page.id, event_id: page.id, outcome, analysis_id: analysisId });
}

async function flushSettlements(state, save, preferredId) {
  let preferred;
  const events = state.outbox.slice(0, 4);
  if (preferredId && !events.some((entry) => entry.session_id === preferredId)) {
    const preferredEvent = state.outbox.find((entry) => entry.session_id === preferredId);
    if (preferredEvent) events.unshift(preferredEvent);
  }
  for (const event of events) {
    try {
      const result = await commetApi("/v1/coins/settle", event);
      const { coinsConfirmed = 0 } = await chrome.storage.local.get("coinsConfirmed");
      await chrome.storage.local.set({ coinsConfirmed: Math.max(coinsConfirmed, result.confirmed) });
      state.outbox = state.outbox.filter((entry) => entry.event_id !== event.event_id);
      await save();
      if (event.session_id === preferredId) preferred = result;
    } catch (_error) {
      // The event stays on disk and can be retried after the worker restarts.
      break;
    }
  }
  return preferred;
}

function senderTab(sender) {
  if (sender.frameId !== 0 || !sender.tab || !KokoroPlatforms.getPlatform(new URL(sender.url).hostname)) {
    throw new Error("対象のSNSページが見つかりません。");
  }
  return sender.tab.id;
}

function getPage(state, tab, pageId) {
  const current = state.pages[tab];
  if (current?.pageId === pageId) return current;
  if (current && !current.postId) queueSettlement(state, current);
  const page = { pageId, id: crypto.randomUUID(), pending: 0 };
  state.pages[tab] = page;
  return page;
}

function explorationTick(sender, message) {
  return withExploration(async (state, save) => {
    const tab = senderTab(sender);
    const page = getPage(state, tab, message.pageId);
    await save();
    await flushSettlements(state, save);
    if (page.postId) return { pending: page.pending, picked_up: false };
    const result = await commetApi(
      `/v1/coins/sessions/${page.id}/tick?active=${message.active === true}`, null, 2500, "PUT"
    );
    page.pending = result.pending;
    await chrome.storage.local.set({ coinsConfirmed: result.confirmed });
    await save();
    return result;
  });
}

function beginPost(sender, message) {
  return withExploration(async (state, save) => {
    const tab = senderTab(sender);
    const page = getPage(state, tab, message.pageId);
    if (page.postId) throw new Error("直前の投稿を確認しています。");
    page.postId = message.postId;
    page.attemptedAt = Date.now();
    state.posts[page.postId] = { ...page, tab };
    await save();
    return {};
  });
}

function lookupPost(sender, message) {
  return withExploration(async (state, save) => {
    const page = state.posts[message.postId];
    if (page?.pageId !== message.pageId || page.tab !== senderTab(sender) || page.processing) return null;
    page.processing = true;
    await save();
    return page;
  });
}

function finishPost(sender, message, analysisId) {
  return withExploration(async (state, save) => {
    const tab = senderTab(sender);
    const page = state.posts[message.postId];
    if (page?.pageId !== message.pageId || page.tab !== tab) return null;
    queueSettlement(state, page, analysisId ? "posted" : "unverified", analysisId || null);
    if (state.pages[tab]?.id === page.id) delete state.pages[tab];
    delete state.posts[message.postId];
    await save();
    return await flushSettlements(state, save, page.id) || { status: "queued" };
  });
}

function closeTab(tab, pageId) {
  return withExploration(async (state, save) => {
    const page = state.pages[tab];
    if (page && (!pageId || page.pageId === pageId)) {
      if (!page.postId) queueSettlement(state, page);
      delete state.pages[tab];
      await save();
    }
    await flushSettlements(state, save);
    return {};
  });
}

function leavePage(sender, pageId) {
  return closeTab(senderTab(sender), pageId);
}

function recoverSettlements() {
  return withExploration(flushSettlements).catch(() => {});
}

chrome.tabs.onRemoved.addListener((tab) => closeTab(tab).catch(() => {}));
chrome.tabs.onUpdated.addListener((tab, change) => {
  if (change.status === "loading") closeTab(tab).catch(() => {});
});
chrome.runtime.onStartup.addListener(recoverSettlements);
