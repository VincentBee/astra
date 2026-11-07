// Cache hors ligne : une fois l'appli ouverte une fois, elle se lance sans réseau.
// Penser à changer VERSION à chaque mise en ligne pour que les téléphones
// récupèrent les nouveaux fichiers.
const VERSION = 'astra-p2p-v102';
const FILES = [
  './',
  'index.html',
  'replay.html',
  'style.css',
  'manifest.json',
  'js/app.js',
  'js/aim.js',
  'js/game.js',
  'js/tech.js',
  'js/fleet.js',
  'js/report.js',
  'js/finish.js',
  'js/trade.js',
  'js/session.js',
  'js/bot.js',
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

// Réseau d'abord (pour avoir la dernière version), cache si hors ligne ou si le
// réseau ne répond pas en NET_WAIT ms (réseau « muet » : portail captif, métro,
// D-230). Sans ce délai, la page restait blanche alors que tout est en cache.
const NET_WAIT = 3000;
// Vrai après un délai dépassé, faux dès qu'une réponse du réseau arrive. Tant qu'il
// est vrai, le cache répond tout de suite : sinon chaque `import` de la chaîne des
// modules (app.js → game.js → …) attendrait 3 s de plus, et l'accueil 15 s.
let mute = false;

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const fromCache = () => caches.match(e.request, { ignoreSearch: true });
  // La réponse du réseau, même tardive, est mise en cache : la prochaine ouverture
  // aura la nouvelle version. waitUntil est appelé tout de suite (pas après
  // respondWith), sinon le service worker peut s'arrêter avant d'écrire. La copie
  // est faite avant de rendre la réponse à la page (then enregistré en premier).
  const net = fetch(e.request);
  e.waitUntil(
    net
      .then((res) => {
        mute = false;
        const copy = res.clone();
        return caches.open(VERSION).then((c) => c.put(e.request, copy));
      })
      .catch(() => {}),
  );
  e.respondWith(
    new Promise((resolve) => {
      let done = false;
      const give = (res) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(res);
      };
      const tryCache = (silence) =>
        fromCache().then((hit) => {
          if (!hit) return; // jamais mise en cache : on attend le réseau
          if (silence) mute = true;
          give(hit);
        });
      // Délai écoulé (ou réseau déjà muet) : la copie en cache si elle existe, sinon
      // on attend le réseau (une page jamais mise en cache ne doit pas échouer juste
      // parce qu'elle est lente).
      const timer = setTimeout(() => tryCache(true), mute ? 0 : NET_WAIT);
      net.then(give, () => fromCache().then(give));
    }),
  );
});
