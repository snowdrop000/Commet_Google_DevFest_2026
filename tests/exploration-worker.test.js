"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { randomUUID } = require("node:crypto");
const { runInNewContext } = require("node:vm");

const source = readFileSync("content/exploration-worker.js", "utf8");
const sender = { tab: { id: 42 }, frameId: 0, url: "https://x.com/home" };

function fixture() {
  const local = {}, session = {};
  const events = [];
  let online = true;
  function storage(values) {
    return {
      async get(key) { return { [key]: structuredClone(values[key]) }; },
      async set(update) { Object.assign(values, structuredClone(update)); }
    };
  }
  function boot() {
    return runInNewContext(source + "\n({ explorationTick, beginPost, lookupPost, finishPost, closeTab, recoverSettlements })", {
      chrome: {
        storage: { local: storage(local), session: storage(session) },
        runtime: { onStartup: { addListener() {} } },
        tabs: { onRemoved: { addListener() {} }, onUpdated: { addListener() {} } }
      },
      KokoroPlatforms: { getPlatform: () => ({ id: "x" }) },
      AbortSignal, URL,
      crypto: { randomUUID },
      async fetch(url, options) {
        if (!online) throw new Error("offline");
        if (url.endsWith("/settle")) {
          const event = JSON.parse(options.body);
          events.push(event);
          return { ok: true, async json() { return { status: "settled", confirmed: 2 }; } };
        }
        return { ok: true, async json() { return { pending: 2, confirmed: 0 }; } };
      }
    });
  }
  return { boot, events, local, session, setOnline: (value) => { online = value; } };
}

async function testPostCloseRace() {
  const f = fixture();
  let worker = f.boot();
  const post = { pageId: randomUUID(), postId: randomUUID() };
  await worker.explorationTick(sender, { pageId: post.pageId, active: true });
  await worker.beginPost(sender, post);
  const original = await worker.lookupPost(sender, post);
  assert.equal(await worker.lookupPost(sender, post), null);
  await worker.closeTab(sender.tab.id);
  assert.equal(f.events.length, 0);
  worker = f.boot(); // MV3 wakes another worker in the same browser session.
  await worker.explorationTick(sender, { pageId: randomUUID(), active: true });
  await worker.finishPost(sender, post, "receipt");
  assert.equal(f.events.length, 1);
  assert.equal(f.events[0].session_id, original.id);
  assert.equal(f.events[0].outcome, "posted");
  assert.equal(f.events[0].analysis_id, "receipt");
  assert.equal(await worker.finishPost(sender, post, "receipt"), null);
}

async function testRecovery() {
  const f = fixture();
  let worker = f.boot();
  const post = { pageId: randomUUID(), postId: randomUUID() };
  await worker.explorationTick(sender, { pageId: post.pageId, active: true });
  await worker.beginPost(sender, post);
  await worker.explorationTick({ ...sender, tab: { id: 43 } }, { pageId: randomUUID(), active: true });
  delete f.session.explorationBrowser; // Closing Chrome clears storage.session.
  f.setOnline(false);
  worker = f.boot();
  await worker.recoverSettlements();
  assert.equal(f.local.exploration.outbox.length, 2);
  f.setOnline(true);
  await worker.recoverSettlements();
  await worker.recoverSettlements();
  assert.equal(f.events.length, 2);
  assert.deepEqual(f.events.map((event) => event.outcome).sort(), ["closed", "unverified"]);
  assert.equal(f.local.exploration.outbox.length, 0);
}

Promise.resolve()
  .then(testPostCloseRace)
  .then(testRecovery)
  .then(() => console.log("Commet exploration worker tests: 2 passed"))
  .catch((error) => { console.error(error); process.exitCode = 1; });
