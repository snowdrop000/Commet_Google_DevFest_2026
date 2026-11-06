"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

const source = readFileSync("content/post-confirmation.js", "utf8");
const comment = (text, id) => ({
  text,
  closest: () => ({ querySelector: () => ({ href: `https://youtube.com/watch?v=demo&lc=${id}` }) })
});

async function simulate(platform, initial, after, editorText) {
  let nodes = initial;
  let mutate, timeout;
  const editor = { isConnected: true, text: "見直した文章です" };
  const { watch } = runInNewContext(source + "\nCommetPostConfirmation", {
    document: { body: {}, querySelectorAll: () => nodes },
    MutationObserver: class {
      constructor(callback) { mutate = callback; }
      observe() {}
      disconnect() {}
    },
    setTimeout(callback) { timeout = callback; return 1; },
    clearTimeout() { timeout = null; }
  });
  const result = watch(platform, editor.text, editor, (node) => node.text);
  nodes = after;
  editor.text = editorText;
  mutate();
  if (timeout) timeout();
  return result;
}

async function run() {
  const oldToast = { text: "Your post was sent" };
  assert.equal(await simulate("x", [oldToast], [oldToast], ""), false);
  assert.equal(await simulate("x", [oldToast], [{ text: "ポストが送信されました" }], ""), true);
  const old = comment("見直した文章です", 1);
  const rerendered = comment(old.text, 1);
  const newComment = comment(old.text, 2);
  assert.equal(await simulate("youtube", [old], [rerendered], ""), false);
  assert.equal(await simulate("youtube", [old], [old, newComment], old.text), false);
  assert.equal(await simulate("youtube", [old], [old, newComment], ""), true);
  console.log("Commet post confirmation tests: 5 passed");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
