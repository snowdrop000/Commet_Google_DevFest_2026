"use strict";

importScripts("lib/game.js", "lib/demo.js", "lib/platforms.js", "content/exploration-worker.js");

const DEFAULT_SETTINGS = {
  analyzeOnPost: true,
  demoMode: true,
  useContext: true,
  summarizeVideos: true,
  followComposer: true,
  explore: true
};

let petWrites = Promise.resolve();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handlers = {
    GET_STATE: getState,
    SAVE_PET_PROFILE: () => savePetProfile(message.profile),
    ANALYZE_CONTENT: () => analyzeContent(message, sender),
    COIN_TICK: () => explorationTick(sender, message),
    POST_ATTEMPT: () => beginPost(sender, message),
    POST_UNVERIFIED: () => finishPost(sender, message, null),
    COIN_LEAVE: () => leavePage(sender, message.pageId)
  };
  if (!Object.hasOwn(handlers, message?.type)) return false;
  handlers[message.type]().then(
    (data) => sendResponse({ ok: true, ...data }),
    (error) => sendResponse({ ok: false, error: error.message || "処理に失敗しました。" })
  );
  return true;
});

async function getState() {
  const { pet, settings, coinsConfirmed = 0 } = await chrome.storage.local.get(["pet", "settings", "coinsConfirmed"]);
  const publicSettings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map(
    (key) => [key, settings?.[key] ?? DEFAULT_SETTINGS[key]]
  ));
  return { pet: KokoroGame.sanitizePet(pet), settings: publicSettings, coinsConfirmed };
}

function updatePet(update) {
  const write = petWrites.then(async () => {
    const { pet } = await chrome.storage.local.get("pet");
    const next = update(KokoroGame.sanitizePet(pet));
    await chrome.storage.local.set({ pet: next });
    return next;
  });
  petWrites = write.catch(() => {});
  return write;
}

async function savePetProfile(profile) {
  const pet = await updatePet((current) => KokoroGame.sanitizePet({
    ...current,
    name: profile?.name,
    characterType: profile?.characterType || current.characterType,
    equippedItems: profile?.equippedItems || current.equippedItems
  }));
  return { pet };
}

async function analyzeContent(message, sender) {
  const text = cleanText(message.text, 5000);
  const state = await getState();
  const context = normalizeContext(message.context, state.settings.useContext);
  const commit = Boolean(message.postId);
  const post = commit ? await lookupPost(sender, message) : null;
  if (commit && !post) throw new Error("投稿結果を確認できませんでした。");
  try {
    if (text.length < 2) throw new Error("文章を2文字以上入力してください。");
    let result;
    try {
      result = await commetApi("/v1/analyze", {
        text, context,
        summarizeVideos: state.settings.summarizeVideos,
        allowDemo: state.settings.demoMode,
        session_id: post?.id || null
      }, 24000);
    } catch (error) {
      if (!error.offline || !state.settings.demoMode) throw error;
      result = {
        analysis: KokoroDemo.analyzeText(text, context),
        demo: true,
        contextUsed: {
          reply: Boolean(context.reply?.parentText),
          threadRoot: Boolean(context.reply?.threadRootText),
          content: Boolean(context.content?.title || context.content?.sourceText),
          video: context.content?.title ? "page_metadata" : "none"
        }
      };
    }
    const settlement = commit ? await finishPost(sender, message, result.analysis_id) : null;
    const pet = commit && result.analysis.category !== "context_required"
      ? await updatePet((current) => KokoroGame.applyAnalysis(current, result.analysis, text))
      : state.pet;
    return { analysis: result.analysis, demo: result.demo, contextUsed: result.contextUsed, pet, settlement };
  } catch (error) {
    if (commit) await finishPost(sender, message, null);
    throw error;
  }
}

function normalizeContext(raw, enabled) {
  if (!enabled) return { reply: { isReply: Boolean(raw?.reply?.isReply) } };
  const videoId = /^[A-Za-z0-9_-]{11}$/.test(raw?.content?.videoId || "") ? raw.content.videoId : "";
  return {
    platform: ["x", "youtube"].includes(raw?.platform) ? raw.platform : "unknown",
    reply: {
      isReply: Boolean(raw?.reply?.isReply),
      parentText: cleanText(raw?.reply?.parentText, 1200),
      threadRootText: cleanText(raw?.reply?.threadRootText, 1200)
    },
    content: {
      videoId,
      title: cleanText(raw?.content?.title, 300),
      description: cleanText(raw?.content?.description, 1200),
      sourceText: cleanText(raw?.content?.sourceText, 1200)
    }
  };
}

function cleanText(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}
