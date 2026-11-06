"use strict";

const STORAGE_KEY = "kokoropet-interactive-demo-v1";
const SAMPLE_TEXTS = {
  supportive: "説明が丁寧で、とても参考になりました。次の投稿も応援しています！",
  constructive: "内容は分かりやすかったです。具体例をもう1つ加えると、初学者にもさらに伝わると思います。",
  unconstructive: "この説明は分かりにくいし、内容も足りない。期待外れでした。",
  abusive: "こんな内容も分からないなんて頭が悪い。動画を出すな。",
  neutral: "今日のイベントは18時から始まります。"
};

let activePlatform = "youtube";
let activeView = "check";
let pet = loadPet();
let lastAnalysis = null;
let lastText = "";
let motion;
let exploration = loadExploration();

document.addEventListener("DOMContentLoaded", init);

function init() {
  motion = CommetMotion.create({
    panel: document.querySelector("[data-card]"),
    handle: document.querySelector(".pet-column"),
    onPosition: (position) => { exploration.position = position; saveExploration(); }
  });
  const follow = document.querySelector("[data-follow]");
  const explore = document.querySelector("[data-explore]");
  follow.checked = exploration.followComposer;
  explore.checked = exploration.explore;
  for (const control of [follow, explore]) control.addEventListener("change", () => {
    exploration.followComposer = follow.checked;
    exploration.explore = explore.checked;
    saveExploration();
    motion.configure(exploration);
  });
  document.querySelector("[data-position-reset]").addEventListener("click", () => {
    exploration.position = null;
    saveExploration();
    motion.configure(exploration);
  });
  document.querySelector("[data-example-coins]").addEventListener("click", () => {
    exploration.pending = 20;
    renderCoins("倍率を試せる仮コインを用意しました。");
  });
  document.querySelector("[data-leave]").addEventListener("click", () => settleDemo(1));
  document.querySelector("[data-apply-suggestion]").addEventListener("click", () => {
    if (!lastAnalysis?.suggestion || activeInput().value.trim() !== lastText) return;
    activeInput().value = lastAnalysis.suggestion;
    clearPreview();
    activeInput().focus();
  });
  motion.configure(exploration);
  motion.wake();
  setInterval(() => {
    if (!exploration.explore || document.hidden || document.activeElement === activeInput() || exploration.pending >= 60) return;
    exploration.pending++;
    renderCoins();
    motion.explore(document.querySelector("[data-pet]"), document.querySelector("[data-coin]"));
  }, 4000);
  renderCharacterPicker();
  document.querySelectorAll("[data-platform-button]").forEach((button) => {
    button.addEventListener("click", () => switchPlatform(button.dataset.platformButton));
  });
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.appTab));
  });
  document.querySelectorAll("[data-sample]").forEach((button) => {
    button.addEventListener("click", () => {
      activeInput().value = SAMPLE_TEXTS[button.dataset.sample];
      switchView("check");
      clearPreview();
      activeInput().focus();
    });
  });
  document.querySelectorAll("[data-comment-input]").forEach((input) => {
    input.addEventListener("input", () => {
      clearPreview();
      motion.focus(input.value.trim() ? input : null);
    });
    input.addEventListener("focus", () => motion.focus(input.value.trim() ? input : null));
    input.addEventListener("blur", () => motion.focus(null));
  });
  document.querySelector("[data-check]").addEventListener("click", () => runAnalysis(false));
  document.querySelector("[data-commit]").addEventListener("click", () => commitLastAnalysis());
  document.querySelectorAll("[data-platform-submit]").forEach((button) => {
    button.addEventListener("click", () => runAnalysis(true));
  });
  document.querySelector("[data-collapse]").addEventListener("click", toggleCard);
  document.querySelector("[data-reset]").addEventListener("click", resetDemo);
  switchPlatform(activePlatform);
  switchView(activeView);
  renderPet();
  renderCoins();
}

function switchPlatform(platform) {
  if (platform !== activePlatform && exploration.pending) settleDemo(1);
  activePlatform = platform === "x" ? "x" : "youtube";
  document.querySelectorAll("[data-platform-button]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.platformButton === activePlatform));
  });
  document.querySelectorAll("[data-social-page]").forEach((page) => {
    page.hidden = page.dataset.socialPage !== activePlatform;
  });
  document.querySelector("[data-address]").textContent = activePlatform === "x" ? "x.com/home" : "youtube.com/watch?v=demo";
  document.querySelector("[data-platform-label]").textContent = activePlatform === "x" ? "X・デモ" : "YouTube・デモ";
  document.querySelector("[data-check-label]").textContent = activePlatform === "x" ? "このポストをチェック" : "このコメントをチェック";
  document.querySelector("[data-message]").textContent = activePlatform === "x"
    ? "ポストを入力して、ことばを一緒に見直そう。"
    : "コメントを入力して、ことばを一緒に見直そう。";
  clearPreview();
}

function switchView(view) {
  activeView = view === "status" ? "status" : "check";
  document.querySelectorAll("[data-app-tab]").forEach((button) => {
    button.setAttribute("aria-selected", String(button.dataset.appTab === activeView));
  });
  document.querySelectorAll("[data-app-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.appPanel !== activeView;
  });
}

function runAnalysis(commit) {
  const text = activeInput().value.trim();
  if (text.length < 2) {
    document.querySelector("[data-message]").textContent = "2文字以上の文章を入力してね。";
    setPetMood("sad");
    return;
  }
  const context = activePlatform === "youtube"
    ? { reply: { isReply: false, parentText: "" }, content: { videoId: "demo", videoSummary: "Gemini APIを使ったSNS支援機能の紹介動画" } }
    : { reply: { isReply: false, parentText: "" }, content: {} };
  lastText = text;
  lastAnalysis = KokoroDemo.analyzeText(text, context);
  renderAnalysis(lastAnalysis, false);
  switchView("check");
  if (commit) commitLastAnalysis();
}

function renderAnalysis(analysis, committed) {
  const rule = KokoroGame.CATEGORY_RULES[analysis.category] || KokoroGame.CATEGORY_RULES.neutral;
  const result = document.querySelector("[data-result]");
  result.hidden = false;
  result.dataset.tone = analysis.category;
  result.style.background = ["supportive", "constructive_criticism"].includes(analysis.category) ? "#effbe9"
    : ["abusive", "unconstructive_criticism"].includes(analysis.category) ? "#fff0f0" : "#f1f3f4";
  result.style.borderLeftColor = ["supportive", "constructive_criticism"].includes(analysis.category) ? "#65b94a"
    : ["abusive", "unconstructive_criticism"].includes(analysis.category) ? "#ef5b69" : "#72808a";
  document.querySelector("[data-result-title]").textContent = `${rule.label}（デモ）`;
  document.querySelector("[data-result-reason]").textContent = analysis.reason;
  document.querySelector("[data-harm]").textContent = analysis.harm.severity;
  document.querySelector("[data-respect]").textContent = analysis.dialogueStyle.respect;
  document.querySelector("[data-constructiveness]").textContent = analysis.constructivenessScore;
  document.querySelector("[data-empathy-score]").textContent = analysis.empathyScore;
  document.querySelector("[data-delta-preview]").textContent = deltaLabel(rule.deltas);
  document.querySelector("[data-message]").textContent = committed
    ? pet.lastResult?.leveledUp ? "レベルアップ！ことばの力が育ったよ。" : "育成結果へ反映したよ。"
    : moodMessage(rule.mood);
  document.querySelector("[data-commit]").hidden = committed;
  const improvement = document.querySelector("[data-improvement]");
  improvement.open = false;
  improvement.hidden = !analysis.suggestion || !["abusive", "unconstructive_criticism"].includes(analysis.category);
  document.querySelector("[data-suggestion]").textContent = analysis.suggestion;
  setPetMood(committed ? pet.mood : rule.mood);
}

function commitLastAnalysis() {
  if (!lastAnalysis || !lastText) {
    runAnalysis(false);
    if (!lastAnalysis) return;
  }
  pet = KokoroGame.applyAnalysis(pet, lastAnalysis, lastText);
  if (lastAnalysis.category === "context_required") renderCoins("判定保留");
  else settleDemo(lastAnalysis.category === "abusive" ? 0 : 1.5);
  savePet();
  renderPet();
  renderAnalysis(lastAnalysis, true);
}

function renderPet() {
  pet = KokoroGame.sanitizePet(pet);
  const petNode = document.querySelector("[data-pet]");
  petNode.className = `pet character-${pet.characterType} skin-base`;
  petNode.dataset.mood = pet.mood;
  document.querySelector("[data-level]").textContent = pet.level;
  document.querySelector("[data-status-level]").textContent = pet.level;
  document.querySelector("[data-pet-name]").textContent = pet.name;
  const requiredXp = KokoroGame.xpNeeded(pet.level);
  document.querySelector("[data-xp-text]").textContent = `${pet.xp} / ${requiredXp}`;
  document.querySelector("[data-xp-bar]").style.width = `${Math.min(100, pet.xp / requiredXp * 100)}%`;
  document.querySelector("[data-empathy]").textContent = pet.empathy;
  document.querySelector("[data-critical]").textContent = pet.criticalThinking;
  document.querySelector("[data-resilience]").textContent = pet.resilience;
  document.querySelector("[data-empathy-bar]").style.width = `${pet.empathy}%`;
  document.querySelector("[data-critical-bar]").style.width = `${pet.criticalThinking}%`;
  document.querySelector("[data-resilience-bar]").style.width = `${pet.resilience}%`;
  document.querySelector("[data-total-posts]").textContent = pet.totalPosts;
  document.querySelector("[data-streak]").textContent = pet.streak;
  document.querySelector("[data-unlocks]").textContent = pet.unlockedItems.length;
  document.querySelectorAll("[data-character]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.character === pet.characterType));
  });
}

function renderCharacterPicker() {
  document.querySelector("[data-character-picker]").innerHTML = Object.entries(KokoroGame.CHARACTER_TYPES)
    .map(([id, character]) => `<button type="button" data-character="${id}" aria-pressed="false" title="${escapeHtml(character.name)}">${id.toUpperCase()}</button>`)
    .join("");
  document.querySelectorAll("[data-character]").forEach((button) => {
    button.addEventListener("click", () => {
      pet = KokoroGame.sanitizePet({ ...pet, characterType: button.dataset.character });
      savePet();
      renderPet();
    });
  });
}

function clearPreview() {
  lastAnalysis = null;
  lastText = "";
  document.querySelector("[data-result]").hidden = true;
  document.querySelector("[data-commit]").hidden = true;
  document.querySelector("[data-message]").textContent = activePlatform === "x"
    ? "ポストを入力して、ことばを一緒に見直そう。"
    : "コメントを入力して、ことばを一緒に見直そう。";
  setPetMood(pet.mood || "idle");
}

function toggleCard(event) {
  const card = document.querySelector("[data-card]");
  const open = card.dataset.open !== "false";
  card.dataset.open = String(!open);
  event.currentTarget.textContent = open ? "+" : "−";
}

function resetDemo() {
  localStorage.removeItem(STORAGE_KEY);
  pet = KokoroGame.sanitizePet(KokoroGame.DEFAULT_PET);
  exploration.pending = 0;
  exploration.confirmed = 0;
  saveExploration();
  renderCoins("");
  clearPreview();
  renderPet();
  switchView("status");
}

function settleDemo(multiplier) {
  const awarded = Math.floor(exploration.pending * multiplier);
  exploration.pending = 0;
  exploration.confirmed += awarded;
  saveExploration();
  renderCoins(`${multiplier.toFixed(1)}倍で ${awarded} 枚確定`);
}

function renderCoins(message) {
  document.querySelector("[data-pending]").textContent = `仮 ${exploration.pending}`;
  document.querySelector("[data-confirmed]").textContent = `確定 ${exploration.confirmed}`;
  if (message !== undefined) document.querySelector("[data-settlement]").textContent = message;
}

function loadExploration() {
  const defaults = { confirmed: 0, position: null, followComposer: true, explore: true };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem("commet-exploration-demo")), pending: 0 }; }
  catch (_error) { return { ...defaults, pending: 0 }; }
}

function saveExploration() {
  const { pending, ...saved } = exploration;
  try { localStorage.setItem("commet-exploration-demo", JSON.stringify(saved)); }
  catch (_error) { /* The demo can still run when file storage is unavailable. */ }
}

function activeInput() {
  return document.querySelector(`[data-comment-input="${activePlatform}"]`);
}

function setPetMood(mood) {
  document.querySelector("[data-pet]").dataset.mood = mood || "idle";
}

function savePet() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pet));
  } catch (_error) {
    // file:// でストレージが使えないブラウザでも、その場のデモ操作は継続する。
  }
}

function loadPet() {
  try {
    return KokoroGame.sanitizePet(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch (_error) {
    return KokoroGame.sanitizePet(KokoroGame.DEFAULT_PET);
  }
}

function deltaLabel(deltas) {
  const labels = { empathy: "思いやり", criticalThinking: "考える力", resilience: "しなやかさ", xp: "XP" };
  return Object.entries(deltas).map(([key, value]) => `${labels[key]} ${value > 0 ? "+" : ""}${value}`).join("　");
}

function moodMessage(mood) {
  return {
    cry: "少し傷ついちゃった。次は一緒に言い換えよう。",
    sad: "理由や改善案を足すと、もっと伝わりそう。",
    proud: "意見とリスペクト、どちらも伝わったよ！",
    happy: "やさしいことばで元気いっぱい！",
    idle: "穏やかなことばだね。"
  }[mood] || "ことばを一緒に見直そう。";
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = String(value || "");
  return node.innerHTML;
}
