#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.resolve(__dirname, "../sw.js"), "utf8");
const scope = "https://example.test/Reading-Lamp/";
const events = new Map();
const stored = new Map();
let online = true;

function keyOf(request) {
  const value = typeof request === "string" ? request : request.url;
  const url = new URL(value, scope);
  return `${url.origin}${url.pathname}`;
}

function response(label) {
  return { label, ok: true, clone() { return response(label); } };
}

const caches = {
  async keys() { return [...stored.keys()]; },
  async delete(name) { return stored.delete(name); },
  async open(name) {
    if (!stored.has(name)) stored.set(name, new Map());
    const entries = stored.get(name);
    return {
      async match(request) { return entries.get(keyOf(request)); },
      async put(request, value) { entries.set(keyOf(request), value); },
      async addAll(files) {
        if (!online) throw new Error("offline");
        files.forEach((file) => entries.set(keyOf(file), response(file === "./stories.json" ? "new stories" : "shell")));
      },
    };
  },
};

vm.runInNewContext(source, {
  URL,
  caches,
  fetch: async (request) => {
    if (!online) throw new Error("offline");
    return response(keyOf(request).endsWith("/stories.json") ? "new stories" : "network");
  },
  Response: { error: () => ({ error: true }) },
  self: {
    registration: { scope },
    location: { origin: new URL(scope).origin },
    clients: { claim: async () => {} },
    skipWaiting: () => {},
    addEventListener(type, handler) { events.set(type, handler); },
  },
});

function awaitedEvent(type, props = {}) {
  const pending = [];
  const event = { ...props, waitUntil(promise) { pending.push(promise); } };
  events.get(type)(event);
  return Promise.all(pending);
}

async function message(type) {
  let result;
  await awaitedEvent("message", {
    data: { type },
    ports: [{ postMessage(value) { result = value; } }],
  });
  return result;
}

async function request(url, method = "GET") {
  let result;
  const pending = [];
  events.get("fetch")({
    request: { url, method },
    respondWith(promise) { result = promise; },
    waitUntil(promise) { pending.push(promise); },
  });
  if (!result) return null;
  const value = await result;
  await Promise.all(pending);
  return value;
}

(async () => {
  const old = await caches.open("reading-lamp-v71");
  await old.put("./stories.json", response("old stories"));
  const unrelated = await caches.open("other-pwa-v4");
  await unrelated.put("./stories.json", response("unrelated"));

  await awaitedEvent("install");
  online = false;
  await awaitedEvent("activate");
  assert((await caches.keys()).includes("reading-lamp-v71"), "old story bank must survive activation");
  assert((await caches.keys()).includes("other-pwa-v4"), "another PWA cache must survive activation");
  assert.deepEqual(JSON.parse(JSON.stringify(await message("OFFLINE_STATUS"))), { ready: true, current: false });
  assert.equal((await request(`${scope}stories.json`)).label, "old stories", "reading must work while offline after update");
  assert.deepEqual(JSON.parse(JSON.stringify(await message("PREPARE_OFFLINE"))), { ready: false });
  assert((await caches.keys()).includes("reading-lamp-v71"), "failed download must not remove the old bank");
  assert.equal(await request("https://api.anthropic.com/v1/messages", "POST"), null, "API calls must bypass cache");
  assert.equal(await request(`${scope}api/story-reports`), null, "unrelated requests must bypass cache");

  online = true;
  assert.deepEqual(JSON.parse(JSON.stringify(await message("PREPARE_OFFLINE"))), { ready: true });
  assert.deepEqual(JSON.parse(JSON.stringify(await message("OFFLINE_STATUS"))), { ready: true, current: true });
  assert(!(await caches.keys()).includes("reading-lamp-v71"), "old bank must only be removed after the new one is saved");
  assert((await caches.keys()).includes("other-pwa-v4"), "unrelated caches must never be removed");
  online = false;
  assert.equal((await request(`${scope}stories.json`)).label, "new stories", "new package must take priority when available");
  console.log(JSON.stringify({ offlineAfterUpdate: "pass", updatedBank: "pass", unrelatedCache: "preserved", apiIsolation: "pass" }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
