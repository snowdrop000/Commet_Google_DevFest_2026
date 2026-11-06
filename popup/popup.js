"use strict";

const $ = (selector) => document.querySelector(selector);
const hasExtensionRuntime = typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
let pet = { ...KokoroGame.DEFAULT_PET };

document.addEventListener("DOMContentLoaded", init);

async function init() {
  $("#demo-link").hidden = hasExtensionRuntime;
  if (hasExtensionRuntime) {
    const response = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (response?.ok) {
      pet = KokoroGame.sanitizePet(response.pet);
      $("[data-confirmed]").textContent = `確定 ${response.coinsConfirmed}`;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const { exploration } = await chrome.storage.local.get("exploration");
    $("[data-pending]").textContent = `仮 ${exploration?.pages?.[tab?.id]?.pending ?? 0}`;
  }
  render();

  $("#settings").addEventListener("click", () => {
    if (hasExtensionRuntime) chrome.runtime.openOptionsPage();
    else window.location.href = "../options/options.html";
  });
  $("#customize-toggle").addEventListener("click", () => {
    const form = $("#profile-form");
    form.hidden = !form.hidden;
    $("#customize-toggle b").textContent = form.hidden ? "＋" : "−";
  });
  $("#profile-form").addEventListener("submit", saveProfile);

  document.querySelectorAll('input[name="characterType"]')
    .forEach((input) => input.addEventListener("change", previewProfile));
  ["#skin-select", "#hat-select", "#badge-select"]
    .forEach((selector) => $(selector).addEventListener("change", previewProfile));
  $("#pet-name").addEventListener("input", previewProfile);
}

function render() {
  $("[data-level]").textContent = pet.level;
  $("[data-name]").textContent = pet.name;
  $("[data-posts]").textContent = pet.totalPosts;
  $("[data-streak]").textContent = pet.streak;
  $("[data-empathy]").textContent = pet.empathy;
  $("[data-critical]").textContent = pet.criticalThinking;
  $("[data-resilience]").textContent = pet.resilience;
  $("[data-empathy-bar]").style.width = `${pet.empathy}%`;
  $("[data-critical-bar]").style.width = `${pet.criticalThinking}%`;
  $("[data-resilience-bar]").style.width = `${pet.resilience}%`;

  const required = KokoroGame.xpNeeded(pet.level);
  $("[data-xp]").textContent = `${pet.xp} / ${required}`;
  $("[data-xp-bar]").style.width = `${Math.min(100, pet.xp / required * 100)}%`;
  $("[data-speech]").textContent = speechForMood(pet.mood, pet.lastResult);

  renderEquipmentOptions();
  applyPetVisual($("[data-pet]"), pet.characterType, pet.equippedItems, pet.mood);
  $("#pet-name").value = pet.name;
  const characterInput = document.querySelector(`input[name="characterType"][value="${pet.characterType}"]`);
  if (characterInput) characterInput.checked = true;
  renderCharacterDescription(pet.characterType);
  renderRewards();
  renderHistory();
}

function renderEquipmentOptions() {
  const mapping = {
    skin: $("#skin-select"),
    hat: $("#hat-select"),
    badge: $("#badge-select")
  };
  for (const [slot, select] of Object.entries(mapping)) {
    const items = pet.unlockedItems
      .filter((id) => KokoroGame.ITEM_CATALOG[id]?.slot === slot)
      .map((id) => [id, KokoroGame.ITEM_CATALOG[id]]);
    select.innerHTML = items.map(([id, item]) => (
      `<option value="${escapeHtml(id)}">${escapeHtml(item.icon)} ${escapeHtml(item.name)}</option>`
    )).join("");
    select.value = pet.equippedItems[slot];
  }
}

function previewProfile() {
  const data = new FormData($("#profile-form"));
  const characterType = data.get("characterType") || pet.characterType;
  const equippedItems = {
    skin: $("#skin-select").value || pet.equippedItems.skin,
    hat: $("#hat-select").value || pet.equippedItems.hat,
    badge: $("#badge-select").value || pet.equippedItems.badge
  };
  applyPetVisual($("[data-pet]"), characterType, equippedItems, pet.mood);
  $("[data-name]").textContent = $("#pet-name").value.trim() || "ココロ";
  renderCharacterDescription(characterType);
}

function applyPetVisual(node, characterType, equipment, mood) {
  const skinClass = String(equipment?.skin || "skin_base").replaceAll("_", "-");
  node.className = `pet character-${characterType} ${skinClass}`;
  node.dataset.mood = mood || "idle";
  const hatId = equipment?.hat || "hat_none";
  const badgeId = equipment?.badge || "badge_none";
  const hatNode = node.querySelector("[data-hat]");
  const badgeNode = node.querySelector("[data-badge]");
  hatNode.dataset.item = hatId;
  badgeNode.dataset.item = badgeId;
  hatNode.textContent = hatId === "hat_none" ? "" : KokoroGame.ITEM_CATALOG[hatId]?.icon || "";
  badgeNode.textContent = badgeId === "badge_none" ? "" : KokoroGame.ITEM_CATALOG[badgeId]?.icon || "";
}

function renderCharacterDescription(characterType) {
  const character = KokoroGame.CHARACTER_TYPES[characterType];
  $("[data-character-description]").textContent = character
    ? `${character.name}：${character.description}`
    : "";
}

async function saveProfile(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const profile = {
    name: $("#pet-name").value.trim() || "ココロ",
    characterType: data.get("characterType"),
    equippedItems: {
      skin: $("#skin-select").value,
      hat: $("#hat-select").value,
      badge: $("#badge-select").value
    }
  };
  if (hasExtensionRuntime) {
    const response = await chrome.runtime.sendMessage({ type: "SAVE_PET_PROFILE", profile });
    if (!response?.ok) return;
    pet = KokoroGame.sanitizePet(response.pet);
  } else {
    pet = KokoroGame.sanitizePet({ ...pet, ...profile });
  }
  const button = event.currentTarget.querySelector(".save");
  button.textContent = "保存しました ✓";
  setTimeout(() => { button.textContent = "このキャラに決める"; }, 1400);
  render();
}

function renderRewards() {
  const entries = Object.entries(KokoroGame.ITEM_CATALOG)
    .filter(([, item]) => item.requirement);
  const unlocked = new Set(pet.unlockedItems);
  $("[data-unlock-count]").textContent = entries.filter(([id]) => unlocked.has(id)).length;
  $("[data-rewards]").innerHTML = entries.map(([id, item]) => `
    <article class="reward-item ${unlocked.has(id) ? "" : "is-locked"}">
      <span class="reward-icon">${escapeHtml(unlocked.has(id) ? item.icon : "?")}</span>
      <div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(unlocked.has(id) ? "獲得済み" : rewardProgressLabel(item))}</small></div>
    </article>
  `).join("");

  const newUnlocks = Array.isArray(pet.lastResult?.newUnlocks) ? pet.lastResult.newUnlocks : [];
  const names = newUnlocks.map((id) => KokoroGame.ITEM_CATALOG[id]?.name).filter(Boolean);
  const notice = $("[data-new-rewards]");
  notice.hidden = !names.length;
  notice.textContent = names.length ? `🎁 新しい報酬：${names.join("・")}` : "";
}

function rewardProgressLabel(item) {
  const requirement = item.requirement;
  if (requirement.type === "level") return `LV.${pet.level} / ${requirement.value}`;
  if (requirement.type === "progress") {
    return `${pet.progress[requirement.key] || 0} / ${requirement.value}・${item.hint.replace(/\s*\d+回$/, "")}`;
  }
  if (requirement.type === "stat") return `${pet[requirement.key]} / ${requirement.value}`;
  if (requirement.type === "allStats") {
    const minimum = Math.min(pet.empathy, pet.criticalThinking, pet.resilience);
    return `最低 ${minimum} / ${requirement.value}`;
  }
  return item.hint;
}

function renderHistory() {
  const container = $("[data-history]");
  if (!pet.history.length) {
    container.className = "history-empty";
    container.textContent = "まだ記録がありません。SNSで投稿やコメントをして育てよう。";
    return;
  }
  container.className = "history-list";
  container.innerHTML = pet.history.slice(0, 4).map((item) => {
    const positive = ["supportive", "constructive_criticism", "neutral", "context_required"].includes(item.category);
    const delta = Object.entries(item.deltas || {})
      .filter(([, value]) => value)
      .map(([key, value]) => `${statusIcon(key)} ${value > 0 ? "+" : ""}${value}`)
      .join("  ") || "変化なし";
    return `<article>
      <span class="history-dot ${positive ? "good" : "care"}"></span>
      <div><b>${escapeHtml(item.label)}</b><p>${escapeHtml(item.preview || item.reason)}</p></div>
      <small>${escapeHtml(delta)}</small>
    </article>`;
  }).join("");
}

function statusIcon(key) {
  return { empathy: "♡", criticalThinking: "◇", resilience: "♢", xp: "XP" }[key] || "";
}

function speechForMood(mood, result) {
  const newUnlocks = Array.isArray(result?.newUnlocks) ? result.newUnlocks : [];
  if (newUnlocks.length) return "新しいごほうびを見つけたよ！";
  if (result?.leveledUp) return "レベルアップ！ことばの力が育ったよ。";
  return {
    cry: "少し傷ついちゃった。次は一緒に言い換えよう。",
    sad: "理由や改善案を足すと、もっと伝わりそう。",
    proud: "意見とリスペクト、どちらも伝わったよ！",
    happy: "やさしいことばで元気いっぱい！",
    levelup: "レベルアップ！ことばの力が育ったよ。",
    idle: "きょうは、どんなことばを届ける？"
  }[mood] || "きょうは、どんなことばを届ける？";
}

function escapeHtml(value) {
  const node = document.createElement("span");
  node.textContent = String(value || "");
  return node.innerHTML;
}
