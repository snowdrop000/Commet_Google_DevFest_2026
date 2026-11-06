"use strict";

const assert = require("node:assert/strict");
require("../lib/demo.js");

const demo = global.KokoroDemo;
const context = { reply: { isReply: false, parentText: "" }, content: {} };

assert.equal(demo.analyzeText("ありがとうございます。応援しています！", context).category, "supportive");
assert.equal(
  demo.analyzeText("説明は分かりやすいです。具体例をもう1つ加えると、もっと良くなると思います。", context).category,
  "constructive_criticism"
);
assert.equal(demo.analyzeText("この説明は分かりにくいし、内容も足りない。期待外れでした。", context).category, "unconstructive_criticism");
assert.equal(demo.analyzeText("こんなことも分からないなんて頭が悪い。動画を出すな。", context).category, "abusive");
assert.equal(demo.analyzeText("今日のイベントは18時からです。", context).category, "neutral");
assert.equal(
  demo.analyzeText("そう思います", { reply: { isReply: true, parentText: "" }, content: {} }).category,
  "context_required"
);

const supportive = demo.analyzeText("説明が丁寧で参考になりました。応援しています！", context);
assert.equal(supportive.harm.severity, 0);
assert.ok(supportive.empathyScore >= 6);

console.log("KokoroPet demo analyzer tests: 8 passed");
