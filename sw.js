// Service worker for installability + basic offline app-shell caching.
// IMPORTANT: this deliberately does NOT cache or intercept Firebase/Firestore
// traffic or any cross-origin request (fonts, CDN libs, gstatic, etc.) —
// only same-origin static files get the cache-first treatment. Live
// attendance data must always go straight to the network.

const CACHE_NAME = "sas-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/auth.js",
  "./js/firebase-config.js",
  "./js/utils.js",
  "./js/notifications.js",
  "./js/qr.js",
  "./js/student.js",
  "./js/faculty.js",
  "./js/admin.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {
      // If a single asset fails (e.g. running from a subpath), don't block
      // install entirely — the app still works, just without full precache.
    })
  );
  self.skipWaiting();
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
  const req = event.request;

  // Only handle same-origin GET requests for the app shell.
  // Everything else (Firebase, Google Fonts, jsdelivr/cdnjs libs, POSTs)
  // passes straight through untouched.
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
