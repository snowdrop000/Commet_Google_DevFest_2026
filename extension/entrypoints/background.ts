import { browser, type Browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { analyzeResponse } from "../../shared/model";
import { profile } from "../../shared/game";
import { exchangeShop } from "../../shared/gacha";
import { api, healthSchema } from "../core/api";
import { currentUser, emulator, login, logout } from "../core/auth";
import { beginPost, closePage, finishPost, recover, tick } from "../core/exploration";
import { defaults, message, preferences, type Message, type State } from "../core/messages";
import { findPlatform } from "../sns/platforms";
import {
  acknowledgeExchange,
  acknowledgeGacha,
  drawGacha,
  exchangeShards,
  pendingExchange,
  pendingGacha,
} from "../core/gacha";

async function state(): Promise<State> {
  const user = await currentUser();
  const stored = await browser.storage.local.get(["commetPreferences", "settings", "petPosition"]);
  const parsed = preferences.safeParse(
    stored.commetPreferences ?? {
      ...(typeof stored.settings === "object" && stored.settings),
      position: stored.petPosition ?? null,
    },
  );
  return {
    signedIn: Boolean(user),
    emulator,
    settings: parsed.success ? parsed.data : defaults,
    profile: user ? await api("/v1/profile", profile, user).catch(() => null) : null,
  };
}

function fromSns(sender: Browser.runtime.MessageSender) {
  return sender.frameId === 0 &&
    sender.tab?.id !== undefined &&
    sender.url &&
    /^https:\/\//.test(sender.url) &&
    findPlatform(new URL(sender.url).hostname)
    ? sender.tab.id
    : undefined;
}

async function handle(input: Message, sender: Browser.runtime.MessageSender) {
  const tabId = fromSns(sender);
  if (input.type === "state") return state();
  if (input.type === "health") return api("/health", healthSchema);
  if (input.type === "login" || input.type === "logout") {
    if (sender.tab && !sender.url?.startsWith(browser.runtime.getURL("/")) && tabId === undefined)
      throw new Error("対応するSNSのページからログインしてください。");
    if (input.type === "login") {
      await login();
      const user = await currentUser();
      if (user) void recover(user).catch(() => {});
    } else {
      await logout();
    }
    return state();
  }
  if (input.type === "preferences") {
    await browser.storage.local.set({ commetPreferences: input.settings });
    return input.settings;
  }
  const user = await currentUser();
  if (!user) throw new Error("拡張機能のポップアップでログインしてください。");
  if (input.type === "gacha") return drawGacha(user);
  if (input.type === "gachaPending") return pendingGacha(user);
  if (input.type === "gachaAck") return acknowledgeGacha(user, input.requestId);
  if (input.type === "exchangePending") return pendingExchange(user);
  if (input.type === "exchangeShop") return api("/v1/gacha/exchange-shop", exchangeShop, user);
  if (input.type === "exchange") return exchangeShards(user, input.selection, input.requestId);
  if (input.type === "exchangeAck") return acknowledgeExchange(user, input.requestId);
  if (input.type === "preview") return api("/v1/analyze", analyzeResponse, user, input.draft);
  if (input.type === "appearance") {
    const pet = await api("/v1/profile/appearance", profile, user, input.appearance, "PATCH");
    await browser.storage.local.set({ commetProfileRevision: crypto.randomUUID() });
    return pet;
  }
  if (tabId === undefined) throw new Error("対応するSNSのタブが見つかりません。");
  switch (input.type) {
    case "tick":
      return tick(user, tabId, input.pageId, input.active);
    case "leave":
      return closePage(user, tabId, input.pageId);
    case "beginPost":
      return beginPost(user, tabId, input.pageId, input.postId);
    case "finishPost":
      return finishPost(user, tabId, input.pageId, input.postId, input.draft);
  }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((data, sender, reply) => {
    const parsed = message.safeParse(data);
    if (!parsed.success) return false;
    void handle(parsed.data, sender).then(
      (value) => reply({ ok: true, value }),
      (error: unknown) =>
        reply({
          ok: false,
          error: error instanceof Error ? error.message : "処理できませんでした。",
        }),
    );
    return true;
  });
  const close = (tabId: number) => {
    void currentUser()
      .then((user) => user && closePage(user, tabId))
      .catch(() => {});
  };
  browser.tabs.onRemoved.addListener(close);
  browser.tabs.onUpdated.addListener((tabId, change) => {
    if (change.status === "loading") close(tabId);
  });
  browser.runtime.onStartup.addListener(() => {
    void currentUser()
      .then((user) => user && recover(user))
      .catch(() => {});
  });
});
