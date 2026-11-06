// Service worker (sw.js, D-230) : réseau d'abord, mais copie en cache si le réseau
// ne répond pas en 3 s. On charge le vrai sw.js dans une petite bac à sable (vm),
// avec un cache en mémoire et le vrai fetch de Node vers un serveur local qui a
// quatre humeurs : « répond », « lent » (répond après 4 s), « muet » (accepte la
// connexion mais ne répond jamais) et « coupé » (serveur arrêté).
// Le même parcours dans un vrai navigateur : tests/sw-browser.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- Serveur local à humeurs ---
let mode = 'up';
const override = new Map(); // chemin → contenu servi à la place du fichier
const sockets = new Set();
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  const send = () => {
    let body;
    if (override.has(path)) body = override.get(path);
    else {
      try {
        body = readFileSync(join(root, path === '/' ? 'index.html' : path));
      } catch {
        res.writeHead(404).end();
        return;
      }
    }
    res.writeHead(200).end(body);
  };
  if (mode === 'stall') return; // muet : ne répond jamais
  if (mode === 'slow') return void setTimeout(send, 4000);
  send();
});
server.on('connection', (s) => {
  sockets.add(s);
  s.on('close', () => sockets.delete(s));
});
let origin;

// --- Cache en mémoire (l'essentiel de l'API CacheStorage) ---
const store = new Map(); // nom → Map(url sans ?query → Response)
const key = (r) => {
  const u = new URL(typeof r === 'string' ? r : r.url, origin);
  return u.origin + u.pathname;
};
const cacheOf = (name) => {
  if (!store.has(name)) store.set(name, new Map());
  const m = store.get(name);
  return {
    async put(req, res) {
      m.set(key(req), res);
    },
    async addAll(urls) {
      for (const u of urls) {
        const res = await fetch(new URL(u, origin + '/'));
        if (!res.ok) throw new TypeError(`addAll : ${u} → ${res.status}`);
        m.set(key(new URL(u, origin + '/').href), res);
      }
    },
  };
};
const caches = {
  open: async (name) => cacheOf(name),
  keys: async () => [...store.keys()],
  delete: async (name) => store.delete(name),
  async match(req) {
    for (const m of store.values()) {
      const hit = m.get(key(req));
      if (hit) return hit.clone();
    }
    return undefined;
  },
};

// --- Le vrai sw.js, chargé dans un bac à sable ---
const listeners = {};
const fire = (type, extra = {}) => {
  const waits = [];
  let response;
  const e = {
    ...extra,
    waitUntil: (p) => waits.push(p),
    respondWith: (p) => (response = p),
  };
  listeners[type](e);
  return { response, waits };
};
// Une requête comme la page en ferait une : réponse, durée, et promesses de fond.
async function get(path) {
  const t0 = Date.now();
  const { response, waits } = fire('fetch', { request: new Request(origin + path) });
  const res = await response;
  return { res, ms: Date.now() - t0, text: res ? await res.text() : null, waits };
}
const cached = async (path) => {
  const hit = await caches.match(new Request(origin + path));
  return hit ? hit.text() : null;
};

before(async () => {
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  origin = `http://127.0.0.1:${server.address().port}`;
  const self = {
    addEventListener: (type, fn) => (listeners[type] = fn),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  vm.runInNewContext(readFileSync(join(root, 'sw.js'), 'utf8'), {
    self,
    caches,
    fetch,
    location: new URL(origin + '/'),
    URL,
    setTimeout,
    clearTimeout,
    Promise,
  });
  // Installation : tous les fichiers de FILES vont dans le cache.
  const { waits } = fire('install');
  await Promise.all(waits);
});

after(() => {
  for (const s of sockets) s.destroy(); // débloque les requêtes restées sans réponse
  server.close();
});

const page = readFileSync(join(root, 'index.html'), 'utf8');

test('serveur qui répond : la version du réseau est servie, et une modification arrive', async () => {
  mode = 'up';
  const a = await get('/index.html');
  assert.equal(a.text, page);
  override.set('/index.html', '<!doctype html><title>Astra</title>NOUVELLE VERSION');
  const b = await get('/index.html');
  assert.equal(b.text, override.get('/index.html'), 'la nouvelle version du serveur arrive');
  await Promise.all(b.waits);
  assert.equal(await cached('/index.html'), override.get('/index.html'), 'et elle remplace la copie en cache');
});

test('serveur muet : la copie en cache est servie en moins de 5 s', async () => {
  mode = 'stall';
  // L'accueil et quelques fichiers de FILES, demandés ensemble comme le ferait la page.
  const [r, ...rest] = await Promise.all(['/index.html', '/', '/style.css', '/js/app.js'].map(get));
  assert.ok(r.ms < 5000, `servie en ${r.ms} ms`);
  assert.ok(r.ms >= 2900, `pas avant le délai de 3 s (${r.ms} ms) : le réseau garde sa chance`);
  assert.match(r.text, /NOUVELLE VERSION/);
  for (const x of rest) assert.ok(x.res && x.ms < 5000, `${x.ms} ms`);
  // Le réseau est muet : les fichiers suivants (les `import` en chaîne des modules)
  // viennent du cache tout de suite, sans attendre 3 s chacun.
  const next = await get('/js/game.js');
  assert.ok(next.res && next.ms < 500, `fichier suivant en ${next.ms} ms`);
});

test('serveur muet, page jamais mise en cache : on continue d’attendre le réseau', async () => {
  mode = 'stall';
  const { response } = fire('fetch', { request: new Request(origin + '/pas-en-cache.txt') });
  const late = await Promise.race([response.then(() => 'réponse'), new Promise((ok) => setTimeout(() => ok('attend'), 3500))]);
  assert.equal(late, 'attend', 'pas de réponse vide au bout de 3 s');
});

test('serveur lent (4 s) : le cache d’abord, puis la réponse tardive met le cache à jour', async () => {
  // Une réponse du réseau remet le drapeau « muet » à faux : la course de 3 s reprend.
  mode = 'up';
  await Promise.all((await get('/style.css')).waits);
  mode = 'slow';
  override.set('/index.html', '<!doctype html><title>Astra</title>VERSION LENTE');
  const r = await get('/index.html');
  assert.ok(r.ms < 5000 && r.ms >= 2900, `servie en ${r.ms} ms, après le délai de 3 s`);
  assert.match(r.text, /NOUVELLE VERSION/, 'la copie en cache, pas encore la version lente');
  await Promise.all(r.waits);
  assert.match(await cached('/index.html'), /VERSION LENTE/, 'la prochaine ouverture aura la nouvelle version');
});

test('serveur qui répond de nouveau : on repasse au réseau d\u2019abord', async () => {
  mode = 'up';
  override.set('/index.html', '<!doctype html><title>Astra</title>RETOUR DU RÉSEAU');
  const r = await get('/index.html');
  assert.equal(r.text, override.get('/index.html'));
  await Promise.all(r.waits);
});

test('serveur coupé : la copie en cache est servie tout de suite, comme avant', async () => {
  for (const s of sockets) s.destroy();
  await new Promise((ok) => server.close(ok));
  const r = await get('/index.html');
  assert.ok(r.ms < 1000, `servie en ${r.ms} ms`);
  assert.match(r.text, /RETOUR DU RÉSEAU/);
});
