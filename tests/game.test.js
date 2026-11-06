"use strict";

const assert = require("node:assert/strict");
require("../lib/game.js");

const game = global.KokoroGame;

{
  const result = game.applyAnalysis(
    { ...game.DEFAULT_PET },
    { category: "constructive_criticism", confidence: 9, reason: "具体的な改善案がある" },
    "この点には反対です。理由は…改善案は…"
  );
  assert.equal(result.criticalThinking, 56);
  assert.equal(result.empathy, 52);
  assert.equal(result.xp, 10);
  assert.equal(result.mood, "proud");
  assert.equal(result.history.length, 1);
}

{
  const result = game.applyAnalysis(
    { ...game.DEFAULT_PET },
    { category: "abusive", confidence: 9, reason: "人格攻撃がある" },
    "攻撃的なテスト文"
  );
  assert.equal(result.empathy, 42);
  assert.equal(result.criticalThinking, 46);
  assert.equal(result.resilience, 47);
  assert.equal(result.mood, "cry");
}

{
  const nearLevel = { ...game.DEFAULT_PET, xp: 29 };
  const result = game.applyAnalysis(
    nearLevel,
    { category: "neutral", confidence: 9, reason: "中立" },
    "今日は晴れです"
  );
  assert.equal(result.level, 2);
  assert.equal(result.xp, 1);
  assert.equal(result.mood, "levelup");
  assert.equal(result.lastResult.leveledUp, true);
  assert.ok(result.unlockedItems.includes("skin_sunset"));
}

{
  const original = { ...game.DEFAULT_PET, empathy: 2 };
  const result = game.applyAnalysis(
    original,
    { category: "abusive", confidence: 10, reason: "境界値" },
    "テスト"
  );
  assert.equal(result.empathy, 0);
  assert.equal(original.empathy, 2, "入力オブジェクトを破壊しない");
}

{
  const result = game.applyAnalysis(
    { ...game.DEFAULT_PET },
    { category: "abusive", confidence: 4, reason: "確信度が低い" },
    "文脈不明のテスト"
  );
  assert.equal(result.empathy, 50);
  assert.equal(result.criticalThinking, 50);
  assert.equal(result.resilience, 50);
}

{
  const result = game.applyAnalysis(
    { ...game.DEFAULT_PET },
    { category: "context_required", confidence: 3, reason: "返信元が不足" },
    "返信テスト"
  );
  assert.equal(result.empathy, 50);
  assert.equal(result.xp, 0);
  assert.equal(result.mood, "idle");
}

{
  let result = { ...game.DEFAULT_PET };
  const supportive = {
    category: "supportive",
    confidence: 9,
    harm: { severity: 0 },
    dialogueStyle: { respect: 7 },
    constructivenessScore: 2,
    empathyScore: 9,
    context: { quality: "full", replyRelation: "not_reply" },
    reason: "応援"
  };
  result = game.applyAnalysis(result, supportive, "応援しています");
  result = game.applyAnalysis(result, supportive, "がんばって");
  result = game.applyAnalysis(result, supportive, "ありがとう");
  assert.equal(result.progress.supportive, 3);
  assert.ok(result.unlockedItems.includes("hat_heart"));
  assert.ok(result.lastResult.newUnlocks.includes("hat_heart"));
}

{
  const eligible = game.sanitizePet({
    ...game.DEFAULT_PET,
    empathy: 70,
    equippedItems: { skin: "skin_aurora", hat: "hat_halo", badge: "badge_book" }
  });
  assert.ok(eligible.unlockedItems.includes("hat_halo"));
  assert.equal(eligible.equippedItems.hat, "hat_halo");
  assert.equal(eligible.equippedItems.skin, "skin_base", "未解放のスキンは装備できない");
  assert.equal(eligible.equippedItems.badge, "badge_none", "未解放の装備は装備できない");
}

{
  const balanced = game.sanitizePet({
    ...game.DEFAULT_PET,
    empathy: 70,
    criticalThinking: 70,
    resilience: 70
  });
  assert.ok(balanced.unlockedItems.includes("skin_aurora"));
  assert.ok(balanced.unlockedItems.includes("hat_halo"));
  assert.ok(balanced.unlockedItems.includes("badge_book"));
  assert.ok(balanced.unlockedItems.includes("badge_shield"));
}

{
  const invalid = game.sanitizePet({
    ...game.DEFAULT_PET,
    characterType: "unknown",
    unlockedItems: ["fake_item"],
    equippedItems: { skin: "fake_item", hat: "fake_item", badge: "fake_item" }
  });
  assert.equal(invalid.characterType, "a");
  assert.deepEqual(invalid.equippedItems, { skin: "skin_base", hat: "hat_none", badge: "badge_none" });
  assert.ok(!invalid.unlockedItems.includes("fake_item"));
}

{
  let result = { ...game.DEFAULT_PET };
  const dialogue = {
    category: "neutral",
    confidence: 9,
    harm: { severity: 0 },
    dialogueStyle: { respect: 9 },
    constructivenessScore: 7,
    empathyScore: 7,
    context: { quality: "full", replyRelation: "constructive_disagreement" },
    reason: "文脈を踏まえた対話"
  };
  for (let index = 0; index < 5; index += 1) {
    result = game.applyAnalysis(result, dialogue, "返信テスト");
  }
  assert.equal(result.progress.respectful, 5);
  assert.equal(result.progress.contextual, 5);
  assert.equal(result.progress.balanced, 5);
  assert.ok(result.unlockedItems.includes("badge_dialogue"));
  assert.ok(result.unlockedItems.includes("badge_context"));
  assert.ok(result.unlockedItems.includes("badge_balance"));
}

{
  const result = game.applyAnalysis(
    { ...game.DEFAULT_PET },
    {
      category: "supportive",
      confidence: 4,
      harm: { severity: 0 },
      dialogueStyle: { respect: 9 },
      context: { quality: "full", replyRelation: "not_reply" },
      reason: "低確信度"
    },
    "テスト"
  );
  assert.equal(result.progress.supportive, 0);
  assert.equal(result.progress.respectful, 0);
}

console.log("KokoroPet game tests: 12 passed");
