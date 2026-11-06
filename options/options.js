"use strict";

const fields = {
  analyzeOnPost: "#analyze-on-post",
  demoMode: "#demo-mode",
  useContext: "#use-context",
  summarizeVideos: "#summarize-videos",
  followComposer: "#follow-composer",
  explore: "#explore"
};
const form = document.querySelector("#settings-form");
const status = document.querySelector("#api-status");

document.addEventListener("DOMContentLoaded", async () => {
  const { settings } = await chrome.storage.local.get("settings");
  for (const [key, selector] of Object.entries(fields)) {
    document.querySelector(selector).checked = settings?.[key] !== false;
  }
  try {
    const response = await fetch("http://127.0.0.1:8765/health", {
      headers: { "X-Commet-Client": "extension" }, signal: AbortSignal.timeout(2000)
    });
    if (!response.ok) throw new Error();
    status.textContent = (await response.json()).gemini ? "Gemini設定済み" : "接続済み（デモ）";
    status.className = "connected";
  } catch (_error) {
    status.textContent = "サーバー未接続";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = Object.fromEntries(Object.entries(fields).map(
    ([key, selector]) => [key, document.querySelector(selector).checked]
  ));
  await chrome.storage.local.set({ settings });
  const saved = document.querySelector("#saved");
  saved.textContent = "保存しました ✓";
  setTimeout(() => { saved.textContent = ""; }, 1800);
});

document.querySelector("#reset-position").addEventListener("click", () => chrome.storage.local.remove("petPosition"));
