// Cache hors ligne : une fois l'appli ouverte une fois, elle se lance sans réseau.
// Penser à changer VERSION à chaque mise en ligne pour que les téléphones
// récupèrent les nouveaux fichiers.
const VERSION = 'astra-p2p-v67';
const FILES = [
  './',
  'index.html',
  'replay.html',
  'style.css',
  'manifest.json',
  'js/app.js',
  'js/game.js',
  'js/tech.js',
  'js/fleet.js',
  'js/trade.js',
  'js/session.js',
  'js/save.js',
  'js/replay.js',
  'js/replay-view.js',
  'js/sky.js',
  'js/icons.js',
  'js/galaxy.js',
  'js/peer.js',
  'js/invite.js',
  'js/config.js',
  'js/scanner.js',
  'js/rendezvous.js',
  'vendor/qrcode.mjs',
  'vendor/jsQR.js',
  'vendor/trystero-nostr.mjs',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
