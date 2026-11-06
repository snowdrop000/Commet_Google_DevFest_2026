(function (root) {
  "use strict";

  const DEFAULT_PET = Object.freeze({
    name: "ココロ",
    characterType: "a",
    bodyColor: "mint",
    accent: "heart",
    equippedItems: Object.freeze({ skin: "skin_base", hat: "hat_none", badge: "badge_none" }),
    unlockedItems: Object.freeze(["skin_base", "hat_none", "badge_none"]),
    progress: Object.freeze({
      supportive: 0,
      constructive: 0,
      respectful: 0,
      contextual: 0,
      balanced: 0
    }),
    level: 1,
    xp: 0,
    empathy: 50,
    criticalThinking: 50,
    resilience: 50,
    mood: "idle",
    totalPosts: 0,
    streak: 0,
    lastActiveDate: null,
    lastResult: null,
    history: []
  });

  const CATEGORY_RULES = Object.freeze({
    abusive: {
      label: "だれかを傷つける表現",
      mood: "cry",
      deltas: { empathy: -8, criticalThinking: -4, resilience: -3, xp: 0 }
    },
    unconstructive_criticism: {
      label: "改善につながりにくい批判",
      mood: "sad",
      deltas: { empathy: -3, criticalThinking: -2, resilience: 0, xp: 0 }
    },
    constructive_criticism: {
      label: "適切で建設的な批判",
      mood: "proud",
      deltas: { empathy: 2, criticalThinking: 6, resilience: 2, xp: 10 }
    },
    supportive: {
      label: "思いやりのある投稿",
      mood: "happy",
      deltas: { empathy: 6, criticalThinking: 1, resilience: 2, xp: 8 }
    },
    neutral: {
      label: "穏やかな投稿",
      mood: "idle",
      deltas: { empathy: 1, criticalThinking: 1, resilience: 1, xp: 2 }
    },
    context_required: {
      label: "文脈が足りないため判定保留",
      mood: "idle",
      deltas: { empathy: 0, criticalThinking: 0, resilience: 0, xp: 0 }
    }
  });

  const CHARACTER_TYPES = Object.freeze({
    a: Object.freeze({ name: "バウンシーコア", description: "弾んで気持ちを表す、素直なコア型" }),
    b: Object.freeze({ name: "メルティドロップ", description: "伸びたり溶けたりするジェル型" }),
    c: Object.freeze({ name: "ピクセルブロック", description: "周囲のピクセルが反応するデジタル型" }),
    d: Object.freeze({ name: "ストレッチモチ", description: "長い腕で感情を伝えるモチ型" }),
    e: Object.freeze({ name: "ボイスバブル", description: "言葉の力が見える吹き出し型" })
  });

  const ITEM_CATALOG = Object.freeze({
    skin_base: Object.freeze({ slot: "skin", name: "オリジナルカラー", icon: "●", hint: "最初から所持" }),
    hat_none: Object.freeze({ slot: "hat", name: "帽子なし", icon: "−", hint: "最初から所持" }),
    badge_none: Object.freeze({ slot: "badge", name: "アクセサリーなし", icon: "−", hint: "最初から所持" }),
    skin_sunset: Object.freeze({ slot: "skin", name: "サンセットスキン", icon: "◐", hint: "LV.2", requirement: { type: "level", value: 2 } }),
    badge_star: Object.freeze({ slot: "badge", name: "はじまりの星", icon: "★", hint: "LV.3", requirement: { type: "level", value: 3 } }),
    skin_midnight: Object.freeze({ slot: "skin", name: "ミッドナイトスキン", icon: "◆", hint: "LV.5", requirement: { type: "level", value: 5 } }),
    hat_crown: Object.freeze({ slot: "hat", name: "ことばの王冠", icon: "♛", hint: "LV.10", requirement: { type: "level", value: 10 } }),
    hat_heart: Object.freeze({ slot: "hat", name: "ハートハット", icon: "♥", hint: "応援・共感 3回", requirement: { type: "progress", key: "supportive", value: 3 } }),
    hat_scholar: Object.freeze({ slot: "hat", name: "研究者ハット", icon: "▰", hint: "建設的な批判 3回", requirement: { type: "progress", key: "constructive", value: 3 } }),
    badge_dialogue: Object.freeze({ slot: "badge", name: "対話上手バッジ", icon: "∞", hint: "敬意8以上 5回", requirement: { type: "progress", key: "respectful", value: 5 } }),
    badge_context: Object.freeze({ slot: "badge", name: "文脈マスターバッジ", icon: "↪", hint: "文脈を踏まえた返信 3回", requirement: { type: "progress", key: "contextual", value: 3 } }),
    badge_balance: Object.freeze({ slot: "badge", name: "ハーモニーエンブレム", icon: "◎", hint: "バランスのよい投稿 3回", requirement: { type: "progress", key: "balanced", value: 3 } }),
    hat_halo: Object.freeze({ slot: "hat", name: "やさしさの光輪", icon: "○", hint: "思いやり 70", requirement: { type: "stat", key: "empathy", value: 70 } }),
    badge_book: Object.freeze({ slot: "badge", name: "知恵の本", icon: "▣", hint: "考える力 70", requirement: { type: "stat", key: "criticalThinking", value: 70 } }),
    badge_shield: Object.freeze({ slot: "badge", name: "しなやかシールド", icon: "◇", hint: "しなやかさ 70", requirement: { type: "stat", key: "resilience", value: 70 } }),
    skin_aurora: Object.freeze({ slot: "skin", name: "オーロラスキン", icon: "✦", hint: "3ステータスすべて70", requirement: { type: "allStats", value: 70 } })
  });

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function sanitizePet(value) {
    const pet = { ...DEFAULT_PET, ...(value || {}) };
    pet.name = String(pet.name || DEFAULT_PET.name).slice(0, 12);
    pet.characterType = CHARACTER_TYPES[pet.characterType] ? pet.characterType : DEFAULT_PET.characterType;
    pet.bodyColor = ["mint", "peach", "sky", "lilac"].includes(pet.bodyColor)
      ? pet.bodyColor
      : DEFAULT_PET.bodyColor;
    pet.accent = ["star", "heart", "spark"].includes(pet.accent)
      ? pet.accent
      : DEFAULT_PET.accent;
    pet.level = clamp(Math.floor(pet.level), 1, 99);
    pet.xp = clamp(Math.floor(pet.xp), 0, 9999);
    pet.empathy = clamp(pet.empathy, 0, 100);
    pet.criticalThinking = clamp(pet.criticalThinking, 0, 100);
    pet.resilience = clamp(pet.resilience, 0, 100);
    pet.progress = { ...DEFAULT_PET.progress, ...(value?.progress || {}) };
    for (const key of Object.keys(DEFAULT_PET.progress)) {
      pet.progress[key] = clamp(Math.floor(pet.progress[key]), 0, 9999);
    }
    const storedUnlocks = Array.isArray(value?.unlockedItems) ? value.unlockedItems : [];
    pet.unlockedItems = [...new Set([
      "skin_base", "hat_none", "badge_none",
      ...storedUnlocks.filter((id) => ITEM_CATALOG[id]),
      ...eligibleItemIds(pet)
    ])];
    const requestedEquipment = { ...DEFAULT_PET.equippedItems, ...(value?.equippedItems || {}) };
    pet.equippedItems = {
      skin: validEquippedItem(requestedEquipment.skin, "skin", pet.unlockedItems, "skin_base"),
      hat: validEquippedItem(requestedEquipment.hat, "hat", pet.unlockedItems, "hat_none"),
      badge: validEquippedItem(requestedEquipment.badge, "badge", pet.unlockedItems, "badge_none")
    };
    pet.history = Array.isArray(pet.history) ? pet.history.slice(0, 20) : [];
    return pet;
  }

  function validEquippedItem(itemId, slot, unlockedItems, fallback) {
    return ITEM_CATALOG[itemId]?.slot === slot && unlockedItems.includes(itemId) ? itemId : fallback;
  }

  function eligibleItemIds(pet) {
    return Object.entries(ITEM_CATALOG)
      .filter(([, item]) => isRewardEligible(pet, item))
      .map(([id]) => id);
  }

  function isRewardEligible(pet, item) {
    const requirement = item.requirement;
    if (!requirement) return true;
    if (requirement.type === "level") return pet.level >= requirement.value;
    if (requirement.type === "progress") return Number(pet.progress?.[requirement.key] || 0) >= requirement.value;
    if (requirement.type === "stat") return Number(pet[requirement.key] || 0) >= requirement.value;
    if (requirement.type === "allStats") {
      return [pet.empathy, pet.criticalThinking, pet.resilience].every((value) => value >= requirement.value);
    }
    return false;
  }

  function updateRewardProgress(pet, analysis, category, confidence) {
    if (confidence < 6 || category === "context_required") return;
    const harm = Number(analysis.harm?.severity ?? analysis.toxicity ?? 0);
    const respect = Number(analysis.dialogueStyle?.respect || 0);
    const replyRelation = analysis.context?.replyRelation;

    if (category === "supportive" && harm <= 2) pet.progress.supportive += 1;
    if (category === "constructive_criticism" && harm <= 2) pet.progress.constructive += 1;
    if (respect >= 8 && harm <= 2) pet.progress.respectful += 1;
    if (analysis.context?.quality !== "insufficient"
      && replyRelation
      && !["not_reply", "unclear"].includes(replyRelation)) {
      pet.progress.contextual += 1;
    }
    if (Number(analysis.constructivenessScore || 0) >= 6
      && Number(analysis.empathyScore || 0) >= 6
      && respect >= 6
      && harm <= 2) {
      pet.progress.balanced += 1;
    }
  }

  function xpNeeded(level) {
    return 30 + (Math.max(1, level) - 1) * 15;
  }

  function applyAnalysis(currentPet, analysis, sourceText) {
    const pet = sanitizePet(currentPet);
    const unlockedBefore = new Set(pet.unlockedItems);
    const category = CATEGORY_RULES[analysis.category] ? analysis.category : "neutral";
    const rule = CATEGORY_RULES[category];
    const confidence = clamp(analysis.confidence, 0, 10);
    const multiplier = confidence >= 8 ? 1 : confidence >= 5 ? 0.75 : 0.5;
    const scaled = {};

    for (const [key, raw] of Object.entries(rule.deltas)) {
      // 文脈や確信度が足りない場合、誤判定によってステータスを下げない。
      const delta = raw < 0 && confidence < 5
        ? 0
        : raw === 0 ? 0 : Math.round(raw * multiplier);
      scaled[key] = delta;
      if (key === "xp") pet.xp += delta;
      else pet[key] = clamp(pet[key] + delta, 0, 100);
    }

    let leveledUp = false;
    while (pet.level < 99 && pet.xp >= xpNeeded(pet.level)) {
      pet.xp -= xpNeeded(pet.level);
      pet.level += 1;
      pet.empathy = clamp(pet.empathy + 2, 0, 100);
      pet.criticalThinking = clamp(pet.criticalThinking + 2, 0, 100);
      pet.resilience = clamp(pet.resilience + 2, 0, 100);
      leveledUp = true;
    }

    updateRewardProgress(pet, analysis, category, confidence);
    pet.unlockedItems = [...new Set([...pet.unlockedItems, ...eligibleItemIds(pet)])];
    const newUnlocks = pet.unlockedItems.filter((id) => !unlockedBefore.has(id));

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (pet.lastActiveDate !== today) {
      pet.streak = pet.lastActiveDate === yesterday ? pet.streak + 1 : 1;
      pet.lastActiveDate = today;
    }

    pet.mood = leveledUp ? "levelup" : rule.mood;
    pet.totalPosts += 1;
    pet.lastResult = {
      ...analysis,
      category,
      label: rule.label,
      deltas: scaled,
      leveledUp,
      newUnlocks,
      at: Date.now()
    };
    pet.history.unshift({
      category,
      label: rule.label,
      reason: String(analysis.reason || "").slice(0, 160),
      preview: String(sourceText || "").replace(/\s+/g, " ").slice(0, 60),
      deltas: scaled,
      at: Date.now()
    });
    pet.history = pet.history.slice(0, 20);
    return pet;
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  root.KokoroGame = {
    DEFAULT_PET,
    CHARACTER_TYPES,
    ITEM_CATALOG,
    CATEGORY_RULES,
    applyAnalysis,
    sanitizePet,
    xpNeeded,
    hashText
  };
})(typeof self !== "undefined" ? self : globalThis);
