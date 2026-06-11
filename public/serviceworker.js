/*! MoEngage Service Worker */

importScripts("https://cdn.moengage.com/release/dc_3/serviceworker_cdn.min.latest.js");

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Clean old caches once
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));

    // Take control without forcing reload
    await self.clients.claim();
  })());
});