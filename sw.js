const CACHE_NAME = "reading-lamp-v33";
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
  "./stories.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/settings-gear.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => caches.keys())
      .then((keys) => {
        const needsMigration = keys.some((key) => {
          const match = /^reading-lamp-v(\d+)$/.exec(key);
          return match && Number(match[1]) < UPDATE_PROMPT_FIRST_VERSION;
        });
        return needsMigration ? self.skipWaiting() : undefined;
      })
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache/interfere with API calls — always go to network.
  if (url.hostname === "api.anthropic.com") return;

  // App shell: cache-first, falling back to network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (event.request.method === "GET" && res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
