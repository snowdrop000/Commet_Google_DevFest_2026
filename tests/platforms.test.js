"use strict";

const assert = require("node:assert/strict");
require("../lib/platforms.js");

const platforms = global.KokoroPlatforms;

assert.equal(platforms.getPlatform("x.com").id, "x");
assert.equal(platforms.getPlatform("www.twitter.com").id, "x");
assert.equal(platforms.getPlatform("www.youtube.com").id, "youtube");
assert.equal(platforms.getPlatform("m.youtube.com").contentLabel, "コメント");
assert.equal(platforms.getPlatform("example.com"), null);

for (const platform of platforms.PLATFORM_DEFINITIONS) {
  assert.ok(platform.composerSelector.length > 10);
  assert.ok(platform.submitSelector.length > 10);
  assert.ok(platform.scopeSelector.length > 2);
}

console.log("KokoroPet platform tests: 7 passed");
