// « Retour » pendant une partie en cours (D-401), dans un vrai navigateur (Chromium via
// Playwright). Pas dans `node --test tests/*.test.mjs` : le dépôt n'a pas de dépendance.
//
//   ASTRA_PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs node tests/back-browser.mjs [dossier-captures]
//
// Parcours : lobby (pas de garde) → partie partie → retour = « Quitter la partie en cours ? »
// → Rester → 2ᵉ retour redemande → fenêtre ouverte : le retour la ferme → Quitter → page
// précédente (about:blank) → partie finie : pas d'alerte.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const spec = process.env.ASTRA_PLAYWRIGHT;
const { chromium } = await import(spec ? pathToFileURL(spec).href : 'playwright');
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const file = path === '/' ? 'index.html' : path.slice(1);
  if (file === 'sw.js') return res.writeHead(404).end(); // pas de cache : on teste les fichiers du dépôt
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(join(root, file)));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const url = `http://localhost:${server.address().port}/`;

const browser = await chromium.launch({ channel: process.env.ASTRA_CHANNEL || 'chrome' });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const pause = (ms) => page.waitForTimeout(ms);
const shot = async (name) => shots && (await page.screenshot({ path: join(shots, `${name}.png`) }));
const quitShown = () => page.evaluate(() => !document.getElementById('sheet-quit').hidden);
const back = async () => {
  await page.evaluate(() => history.back());
  await pause(400);
};
const ok = (label) => console.log(`✔ ${label}`);

await page.goto('about:blank');
await page.goto(url);
await page.fill('#name', 'Vincent');
await page.click('#btn-solo');
await page.click('#btn-race');
await pause(600);
// Lobby : pas de garde dans l'historique, donc un retour fait comme avant (pas d'alerte).
const lobby = await page.evaluate(() => ({ started: astra.session.startedAt, guard: !!history.state?.astraGuard, len: history.length }));
assert.equal(lobby.started, null);
assert.equal(lobby.guard, false);
ok(`lobby : pas de garde (history.length ${lobby.len}, state ${JSON.stringify(lobby.guard)}) → le retour quitte comme avant`);
await shot('1-lobby');

await page.click('#btn-ready');
await page.waitForFunction(() => astra.session.startedAt != null);
await pause(600);
await page.waitForFunction(() => document.getElementById('toast').hidden, null, { timeout: 15000 }); // captures sans message par-dessus
const armed = await page.evaluate(() => ({ guard: !!history.state?.astraGuard, len: history.length }));
assert.equal(armed.guard, true);
ok(`partie partie : garde posée (history.length ${lobby.len} → ${armed.len})`);

await back();
assert.equal(await quitShown(), true);
assert.equal(page.url(), url);
ok('retour en partie → « Quitter la partie en cours ? »');
await shot('2-confirmation');

await page.click('#btn-quit-stay');
await pause(400);
assert.equal(await quitShown(), false);
assert.equal(await page.evaluate(() => !document.getElementById('screen-game').hidden && astra.session.startedAt != null), true);
ok('« Rester » → on reste dans la partie');
await shot('3-reste');

await back();
assert.equal(await quitShown(), true);
ok('2ᵉ retour → la question revient');
await page.click('#btn-quit-close'); // la croix = Rester
await pause(300);
assert.equal(await quitShown(), false);
ok('la croix fait comme « Rester »');

// Fermer l'onglet ou recharger pendant la partie : le navigateur pose sa propre question.
const asked = new Promise((ok) => page.once('dialog', async (d) => {
  const type = d.type();
  await d.dismiss(); // « Annuler » : on reste
  ok(type);
}));
await page.evaluate(() => setTimeout(() => location.reload(), 0));
assert.equal(await asked, 'beforeunload');
await pause(300);
assert.equal(await page.evaluate(() => astra.session?.startedAt != null), true);
ok('rechargement en partie → alerte du navigateur (beforeunload) ; « rester » → la partie est toujours là');

// Une fenêtre ouverte : le retour la ferme d'abord, sans question.
await page.evaluate(() => (document.getElementById('sheet-settings').hidden = false));
await shot('4-fenetre-ouverte');
await back();
const afterSheet = await page.evaluate(() => ({ settings: !document.getElementById('sheet-settings').hidden, quit: !document.getElementById('sheet-quit').hidden, guard: !!history.state?.astraGuard }));
assert.deepEqual(afterSheet, { settings: false, quit: false, guard: true });
ok('fenêtre ouverte + retour → la fenêtre se ferme, pas de question, garde reposée');
await back();
assert.equal(await quitShown(), true);
ok('retour suivant → la question');

await page.click('#btn-quit-go');
await page.waitForURL('about:blank', { timeout: 3000 });
ok(`« Quitter la partie » → page précédente (${page.url()}), sans alerte du navigateur`);
await page.goForward();
await page.waitForFunction(() => !!history.state?.astraGuard || (window.astra?.session?.startedAt == null), null, { timeout: 5000 });
ok(`« avancer » ensuite : la page revient (${await page.evaluate(() => (document.getElementById("screen-home").hidden ? "partie" : "accueil"))}), sans erreur`);

// Partie finie : pas d'alerte (la garde restée est consommée sans rien montrer).
await page.goto(url);
await page.click('#saved [data-resume]');
await page.waitForFunction(() => astra.session?.startedAt != null && !document.getElementById('screen-game').hidden);
await pause(600);
assert.equal(await page.evaluate(() => !!history.state?.astraGuard), true);
ok('partie reprise depuis l\'accueil : garde posée');
await page.evaluate(() => {
  const s = astra.session;
  const over = { at: s.now(), winner: s.me };
  Object.defineProperty(s, 'over', { configurable: true, get: () => over });
});
await pause(600);
await page.click('#btn-finish-close');
await back();
assert.equal(await quitShown(), false);
ok('partie finie + retour → pas d\'alerte');
await shot('5-fin-sans-alerte');

// Rien avant la page (appli installée, onglet neuf) : « Quitter » ramène à l'accueil.
const fresh = await context.newPage(); // même stockage : la partie enregistrée y est
fresh.on('pageerror', (e) => errors.push(e.message));
await fresh.evaluate((u) => location.replace(u), url); // remplace about:blank : rien avant la page
await fresh.waitForSelector('#saved [data-resume]');
assert.equal(await fresh.evaluate(() => history.length), 1);
await fresh.click('#saved [data-resume]');
await fresh.waitForFunction(() => !!history.state?.astraGuard);
await fresh.evaluate(() => history.back());
await fresh.waitForFunction(() => !document.getElementById('sheet-quit').hidden);
await fresh.click('#btn-quit-go');
await fresh.waitForFunction(() => document.getElementById('screen-home')?.hidden === false && !history.state, null, { timeout: 3000 });
ok('sans page précédente : « Quitter la partie » → l\'accueil (la partie reste dans la liste)');
if (shots) await fresh.screenshot({ path: join(shots, '6-accueil-apres-quitter.png') });

assert.deepEqual(errors, []);
ok('aucune erreur dans la page');
await browser.close();
server.close();
