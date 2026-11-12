// Un chargement raté ne reste pas raté (#86, D-510) : le même parcours que
// tests/chargement.test.mjs, dans Chromium, avec l'appli vraie. Pas dans
// `node --test tests/*.test.mjs` : le dépôt n'a pas de dépendance, Playwright doit venir d'ailleurs.
//
//   ASTRA_PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs node tests/chargement-browser.mjs [dossier-captures]
//
// ASTRA_ROOT=<dossier> sert un autre dossier que le dépôt (une copie de main, pour voir le bug).
// Sans service worker (page jamais contrôlée, comme à la toute première visite) ; le réseau est
// coupé pour vendor/jsQR.js et vendor/trystero-nostr.mjs (page.route), puis rétabli.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';

const root = process.env.ASTRA_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = process.env.ASTRA_PLAYWRIGHT;
const { chromium } = await import(spec ? pathToFileURL(spec).href : 'playwright');
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(join(root, file)));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 760 } });
await ctx.grantPermissions(['camera'], { origin: url.slice(0, -1) });
const page = await ctx.newPage();

let down = true;
const requests = { jsQR: [], trystero: [] };
await page.route(/\/vendor\/(jsQR\.js|trystero-nostr\.mjs)/, (route) => {
  const u = new URL(route.request().url());
  requests[u.pathname.includes('jsQR') ? 'jsQR' : 'trystero'].push(u.pathname + u.search);
  return down ? route.abort('internetdisconnected') : route.continue();
});

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? '✔' : '✖'} ${name} — ${detail}`);
};
const shot = (name) => shots && page.screenshot({ path: join(shots, name) });

try {
  await page.goto(url);
  await page.waitForSelector('#btn-solo svg', { state: 'visible' });
  await page.fill('#name', 'Vincent');
  await page.click('#btn-join');

  // 1. Lecteur de QR, réseau coupé, puis revenu.
  await page.click('#btn-scan-offer');
  await page.waitForSelector('#join-error', { state: 'visible', timeout: 5000 });
  const err = await page.textContent('#join-error');
  await shot('1-scanner-reseau-coupe.png');
  check('Scanner, réseau coupé', /introuvable/.test(err), `« ${err} » | requêtes jsQR : ${requests.jsQR.length}`);

  down = false;
  await page.click('#btn-scan-offer');
  let opened = false;
  try {
    await page.waitForFunction(() => !document.getElementById('scanner').hidden && document.getElementById('scanner-video').readyState >= 2, null, { timeout: 5000 });
    opened = true;
  } catch {}
  await page.waitForTimeout(300);
  await shot('2-scanner-reseau-revenu.png');
  const err2 = (await page.isVisible('#join-error')) ? await page.textContent('#join-error') : '';
  check('Scanner, réseau revenu', opened, `${opened ? 'caméra ouverte' : `pas de caméra (« ${err2} »)`} | requêtes jsQR : ${requests.jsQR.length} (${requests.jsQR.join(', ')})`);
  if (opened) await page.click('#btn-scan-cancel');

  // 2. Rendez-vous (Trystero), réseau coupé, puis revenu.
  down = true;
  const first = await page.evaluate(async () => {
    const { Rendezvous } = await import('./js/rendezvous.js');
    window.rdv = new Rendezvous({ gid: 'preuve-86', key: 'k', me: 'moi', onLink() {} });
    await window.rdv.join();
    return window.rdv.state;
  });
  check('Rendez-vous, réseau coupé', first === 'failed', `${first} | requêtes Trystero : ${requests.trystero.length}`);
  down = false;
  const second = await page.evaluate(async () => {
    await window.rdv.refresh();
    const s = window.rdv.state;
    window.rdv.leave();
    return s;
  });
  check('Rendez-vous, réseau revenu', second === 'on', `${second} | requêtes Trystero : ${requests.trystero.length} (${requests.trystero.join(', ')})`);
} finally {
  await browser.close();
  server.close();
}
process.exit(results.every(Boolean) ? 0 : 1);
