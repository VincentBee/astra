// Service worker dans un vrai navigateur (D-230) : le même parcours que
// tests/sw.test.mjs, avec Chromium. Pas dans `node --test tests/*.test.mjs` :
// le dépôt n'a pas de dépendance, Playwright doit venir d'ailleurs.
//
//   ASTRA_PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs node tests/sw-browser.mjs [capture.png]
//
// Serveur local à trois humeurs : « répond », « muet » (accepte la connexion,
// ne répond jamais), « coupé » (serveur arrêté). Affiche les durées mesurées.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = process.env.ASTRA_PLAYWRIGHT;
const { chromium } = await import(spec ? pathToFileURL(spec).href : 'playwright');
const shot = process.argv[2];

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let mode = 'up';
const override = new Map();
const sockets = new Set();
const server = createServer((req, res) => {
  if (mode === 'stall') return;
  const path = new URL(req.url, 'http://x').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  try {
    const body = override.get(file) ?? readFileSync(join(root, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
server.on('connection', (s) => {
  sockets.add(s);
  s.on('close', () => sockets.delete(s));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
// localhost (et non 127.0.0.1) : le jeu n'enregistre le service worker qu'en https ou sur localhost.
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch();
const ctx = await browser.newContext();
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? '✔' : '✖'} ${name} — ${detail}`);
};
// Ouvre l'appli dans un nouvel onglet ; renvoie la durée et ce que montre l'accueil.
async function open() {
  const page = await ctx.newPage();
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    // L'accueil est prêt quand les modules JS ont tourné : icons.js a remplacé
    // l'<i data-ic> du bouton « Contre l'IA » par son icône (svg).
    await page.waitForSelector('#btn-solo svg', { state: 'visible', timeout: 10000 });
    const ms = Date.now() - t0;
    const title = await page.title();
    const marker = await page.evaluate(() => document.documentElement.dataset.marker || '');
    return { page, ms, ok: true, title, marker };
  } catch (err) {
    return { page, ms: Date.now() - t0, ok: false, err: err.message.split('\n')[0] };
  }
}

try {
  // 1. En ligne : premier passage, le service worker s'installe et prend la main.
  let r = await open();
  await r.page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true }));
  });
  const files = await r.page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length);
  check('serveur qui répond, premier passage', r.ok, `accueil « ${r.title} » en ${r.ms} ms, service worker actif, ${files} fichiers en cache`);

  // 2. Serveur qui répond, fichier modifié côté serveur : la nouvelle version arrive.
  const html = readFileSync(join(root, 'index.html'), 'utf8').replace('<html', '<html data-marker="v2"');
  override.set('index.html', html);
  r = await open();
  check('serveur qui répond, index.html modifié', r.ok && r.marker === 'v2', `nouvelle version servie (marqueur « ${r.marker} ») en ${r.ms} ms`);

  // 3. Serveur muet : la copie en cache en moins de 5 s.
  mode = 'stall';
  r = await open();
  check('serveur muet', r.ok && r.ms < 5000, r.ok ? `accueil « ${r.title} » depuis le cache en ${r.ms} ms (marqueur « ${r.marker} »)` : `${r.err} après ${r.ms} ms`);
  if (shot && r.ok) {
    await r.page.waitForTimeout(500);
    await r.page.screenshot({ path: shot });
    console.log(`capture : ${shot}`);
  }

  // 4. Serveur coupé : la copie en cache, tout de suite.
  for (const s of sockets) s.destroy();
  await new Promise((ok) => server.close(ok));
  r = await open();
  check('serveur coupé', r.ok && r.ms < 2000, r.ok ? `accueil « ${r.title} » depuis le cache en ${r.ms} ms` : `${r.err} après ${r.ms} ms`);
} finally {
  await browser.close();
  for (const s of sockets) s.destroy();
  server.close();
}
const failed = results.filter((x) => !x).length;
console.log(`${results.length - failed}/${results.length} réussis`);
process.exit(failed ? 1 : 0);
