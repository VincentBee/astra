// Largeur de la page sur téléphone (#51) : rien ne doit élargir la page, ni dans
// le lobby, ni en partie, ni Journal ouvert. La bulle d'aide de la carte, cause de
// #51, a disparu avec D-245 ; ce test reste comme garde-fou (D-412, D-413).
//
// Node n'a pas de mise en page : ce test lance un vrai Chrome sans fenêtre et le
// pilote par son protocole de débogage (CDP), avec le WebSocket intégré à Node.
// Pas de dépendance (D-413). Sans Chrome sur la machine, le test est sauté ; on
// peut donner le chemin du navigateur par la variable CHROME.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTHS = [320, 375, 430];

/** Un Chrome (ou Chromium) installé, ou null. */
function findChrome() {
  const list = [
    process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  const pw = join(homedir(), 'Library/Caches/ms-playwright');
  if (existsSync(pw)) {
    for (const d of readdirSync(pw).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()) {
      list.push(join(pw, d, 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'));
      list.push(join(pw, d, 'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium'));
      list.push(join(pw, d, 'chrome-linux/chrome'));
    }
  }
  return list.find((p) => p && existsSync(p)) || null;
}

const chrome = findChrome();
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

/** Sert les fichiers du jeu sur un port libre. Pas de service worker (il est servi, mais le test n'en dépend pas). */
function serve() {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = join(root, path === '/' ? 'index.html' : path);
    if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** Lance Chrome sans fenêtre et ouvre une connexion CDP à un onglet. */
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'astra-layout-'));
  const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((ok, ko) => {
    let buf = '';
    const timer = setTimeout(() => ko(new Error('Chrome ne répond pas')), 15000);
    proc.stderr.on('data', (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) { clearTimeout(timer); ok(m[1]); }
    });
    proc.on('exit', () => ko(new Error('Chrome s’est arrêté')));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((ok) => ws.addEventListener('open', ok, { once: true }));
  let id = 0;
  const wait = new Map();
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && wait.has(m.id)) { const [ok, ko] = wait.get(m.id); wait.delete(m.id); m.error ? ko(new Error(m.error.message)) : ok(m.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((ok, ko) => {
    const n = ++id;
    wait.set(n, [ok, ko]);
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });
  const close = () => { try { ws.close(); } catch {} proc.kill(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { send, close };
}

/** Un onglet neuf (stockage vierge) à la largeur `w`, en téléphone. */
async function phone(cdp, w, url) {
  const { browserContextId } = await cdp.send('Target.createBrowserContext');
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => cdp.send(m, p, sessionId);
  await s('Emulation.setDeviceMetricsOverride', { width: w, height: 740, deviceScaleFactor: 2, mobile: true });
  await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await s('Page.enable');
  await s('Page.navigate', { url });
  const js = async (expr) => {
    const r = await s('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  return { js, shot: async () => (await s('Page.captureScreenshot', { format: 'png' })).data };
}

// Code lancé dans la page : attendre une condition, mesurer.
const HELPERS = `
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, what) => {
    for (let i = 0; i < 300; i++) { if (f()) return; await sleep(100); }
    const seen = [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => b.id || b.textContent.trim()).join(', ');
    throw new Error('attente : ' + what + ' (boutons visibles : ' + seen + ')');
  };
  const $ = (id) => document.getElementById(id);
  const width = () => document.documentElement.scrollWidth;
`;

test('la page garde la largeur du téléphone (320, 375, 430 px) : lobby, partie, Journal ouvert', { skip: chrome ? false : 'pas de Chrome sur cette machine (variable CHROME)', timeout: 120000 }, async () => {
  const server = await serve();
  const cdp = await launch();
  try {
    const url = `http://127.0.0.1:${server.address().port}/index.html`;
    for (const w of WIDTHS) {
      const page = await phone(cdp, w, url);
      const lobby = await page.js(`${HELPERS}
        await until(() => $('btn-solo') && $('btn-solo').offsetParent, 'accueil');
        await sleep(500);
        $('name').value = 'Alice'; $('name').dispatchEvent(new Event('input', { bubbles: true }));
        $('btn-solo').click();
        await until(() => $('btn-race') && $('btn-race').offsetParent, 'choix de la race');
        $('btn-race').click();
        await until(() => $('btn-ready') && !$('btn-ready').hidden, 'lobby');
        await sleep(300);
        return width();`);
      const game = await page.js(`${HELPERS}
        $('btn-ready').click();
        await until(() => $('btn-ready').hidden, 'départ');
        await sleep(500);
        const r = { partie: width() };
        $('btn-journal').click(); await sleep(300);
        r.journal = width();
        return r;`);
      assert.equal(lobby, w, `${w} px : lobby, largeur de la page`);
      assert.equal(game.partie, w, `${w} px : en partie, largeur de la page`);
      assert.equal(game.journal, w, `${w} px : Journal ouvert, largeur de la page`);
    }
  } finally {
    cdp.close();
    server.close();
  }
});
