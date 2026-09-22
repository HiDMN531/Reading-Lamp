const CACHE_NAME = "reading-lamp-v77";
const OWN_CACHE_NAME = /^reading-lamp-v(\d+)$/;
// Versions before v32 did not yet have an update prompt. Activate the current
// release automatically once for those users; prompt-capable versions wait for
// the user's "更新する" action.
const UPDATE_PROMPT_FIRST_VERSION = 32;
const SHELL_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./config.json",
  "./privacy.html",
  "./terms.html",
  "./rewards.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/settings-gear.png",
];
const OFFLINE_CONTENT_FILES = ["./stories.json"];
const ownAssetPaths = new Set([...SHELL_FILES, ...OFFLINE_CONTENT_FILES]
  .map((file) => {
    const url = new URL(file, self.registration.scope);
    return `${url.origin}${url.pathname}`;
  }));

async function previousContentResponse(request) {
  const keys = (await caches.keys())
    .filter((key) => key !== CACHE_NAME && OWN_CACHE_NAME.test(key))
    .sort((a, b) => Number(b.match(OWN_CACHE_NAME)[1]) - Number(a.match(OWN_CACHE_NAME)[1]));
  for (const key of keys) {
    const response = await (await caches.open(key)).match(request, { ignoreSearch: true });
    if (response) return response;
  }
  return null;
}

async function offlineContentStatus() {
  const currentCache = await caches.open(CACHE_NAME);
  const current = (await Promise.all(OFFLINE_CONTENT_FILES.map((file) => currentCache.match(file)))).every(Boolean);
  if (current) return { ready: true, current: true };
  const previous = (await Promise.all(OFFLINE_CONTENT_FILES.map(previousContentResponse))).every(Boolean);
  return { ready: previous, current: false };
}

async function deleteOldOwnCachesIfReady() {
  const currentCache = await caches.open(CACHE_NAME);
  const ready = (await Promise.all(OFFLINE_CONTENT_FILES.map((file) => currentCache.match(file)))).every(Boolean);
  if (!ready) return;
  const keys = await caches.keys();
  await Promise.all(keys
    .filter((key) => key !== CACHE_NAME && OWN_CACHE_NAME.test(key))
    .map((key) => caches.delete(key)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => caches.keys())
      .then((keys) => {
        const needsMigration = keys.some((key) => {
          const match = OWN_CACHE_NAME.exec(key);
          return match && Number(match[1]) < UPDATE_PROMPT_FIRST_VERSION;
        });
        return needsMigration ? self.skipWaiting() : undefined;
      })
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  const reply = event.ports && event.ports[0];
  if (event.data.type === "OFFLINE_STATUS") {
    event.waitUntil(
      offlineContentStatus()
        .then((status) => reply && reply.postMessage(status))
        .catch(() => reply && reply.postMessage({ ready: false, current: false }))
    );
  }
  if (event.data.type === "PREPARE_OFFLINE") {
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => cache.addAll(OFFLINE_CONTENT_FILES))
        .then(deleteOldOwnCachesIfReady)
        .then(() => reply && reply.postMessage({ ready: true }))
        .catch(() => reply && reply.postMessage({ ready: false }))
    );
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldOwnCachesIfReady().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle this app's static files. API and unrelated requests use the network.
  if (event.request.method !== "GET" || !ownAssetPaths.has(`${url.origin}${url.pathname}`)) return;

  // The newest cache takes priority. An older story bank is an offline fallback
  // until the updated package has been saved successfully.
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          event.waitUntil(cache.put(event.request, response.clone())
            .then(() => url.pathname.endsWith("/stories.json") ? deleteOldOwnCachesIfReady() : undefined)
            .catch(() => {}));
        }
        return response;
      } catch {
        if (url.pathname.endsWith("/stories.json")) {
          const previous = await previousContentResponse(event.request);
          if (previous) return previous;
        }
        return Response.error();
      }
    })
  );
});
