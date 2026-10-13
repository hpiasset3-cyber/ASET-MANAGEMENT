const CACHE_NAME = "aset-offline-v1";

const BASE_PATH = "/ASET-MANAGEMENT/";

const APP_FILES = [
  BASE_PATH,
  BASE_PATH + "index.html",
  BASE_PATH + "jszip.min.js",
  BASE_PATH + "manifest.webmanifest",
  BASE_PATH + "icon-192.png",
  BASE_PATH + "icon-512.png"
];

// Instal service worker dan simpan file utama aplikasi
self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
    })
  );

  self.skipWaiting();
});

// Aktifkan service worker dan hapus cache lama
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (cacheName) {
            return cacheName !== CACHE_NAME;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          })
      );
    })
  );

  self.clients.claim();
});

// Tangani permintaan file
self.addEventListener("fetch", function (event) {
  const request = event.request;

  // Jangan menangani selain permintaan GET
  if (request.method !== "GET") {
    return;
  }

  // Halaman HTML: coba jaringan, jika gagal gunakan cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (networkResponse) {
          if (networkResponse && networkResponse.ok) {
            const responseCopy = networkResponse.clone();

            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, responseCopy);
            });
          }

          return networkResponse;
        })
        .catch(function () {
          return caches.match(BASE_PATH + "index.html");
        })
    );

    return;
  }

  // File CSS, JavaScript, gambar, font, manifest, dan lainnya
  event.respondWith(
    caches.match(request).then(function (cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(function (networkResponse) {
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type === "opaque"
          ) {
            return networkResponse;
          }

          const responseCopy = networkResponse.clone();

          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, responseCopy);
          });

          return networkResponse;
        })
        .catch(function () {
          // Jika gambar tidak tersedia, gunakan ikon aplikasi
          if (request.destination === "image") {
            return caches.match(BASE_PATH + "icon-192.png");
          }

          return new Response("Konten tidak tersedia dalam mode offline.", {
            status: 503,
            statusText: "Offline",
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          });
        });
    })
  );
});
