// Décisions du domaine réseau (docs/decisions.md) : invitations, fiches,
// sauvegarde et historique, journal des ordres, rendez-vous, icônes, fond étoilé.
// Chaque test dit ce que la doc décide, pas seulement ce que fait le code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, game, Session } from './harness.mjs';

const { MAX_ORDERS } = await import('../js/session.js');
const save = await import('../js/save.js');
const { Rendezvous } = await import('../js/rendezvous.js');
const { ic } = await import('../js/icons.js');
const { startGalaxy } = await import('../js/galaxy.js');

const P = (s) => s.state.players[s.me];
const firstBuilding = (s) => Object.keys(game.RACES[P(s).race].buildings)[0];

/** Faux lien : garde ce qu'on lui envoie. */
function fakeLink(extra = {}) {
  return {
    closed: false,
    sent: [],
    onmessage: null,
    onclose: null,
    send(m) {
      this.sent.push(m);
    },
    close() {
      this.closed = true;
      this.onclose?.();
    },
    ...extra,
  };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** localStorage neuf le temps de `fn` (le banc d'essai en partage un seul). */
async function withStore(fn) {
  const old = globalThis.localStorage;
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  try {
    return await fn(m);
  } finally {
    globalThis.localStorage = old;
  }
}

// ----- D-006 : les deux scans valent accord, 8 joueurs au plus, invitation à usage unique

test('D-006 : un nouveau venu entre sans validation de l’hôte', async () => {
  const { players: [A] } = newGame(2);
  const link = fakeLink();
  await A.onHello(link, { type: 'hello', name: 'Zoé', secretHash: 'a'.repeat(64) });
  const welcome = link.sent.find((m) => m.type === 'welcome');
  assert.ok(welcome, 'welcome envoyé tout de suite');
  assert.equal(A.state.players[welcome.you].name, 'Zoé');
  assert.equal(Object.keys(A.state.players).length, 3);
});

test('D-006 : 8 joueurs au plus, le 9e est refusé', async () => {
  const { players: [A] } = newGame(8);
  const link = fakeLink();
  await A.onHello(link, { type: 'hello', name: 'Neuf', secretHash: 'a'.repeat(64) });
  const refused = link.sent.find((m) => m.type === 'refused');
  assert.ok(refused, 'refused envoyé');
  assert.match(refused.reason, /8/);
  assert.equal(link.sent.some((m) => m.type === 'welcome'), false);
  assert.equal(Object.keys(A.state.players).length, 8);
});

test('D-006 : une invitation ne sert qu’une fois', async () => {
  const { players: [A] } = newGame(1);
  A.invite = { accept: async () => fakeLink(), cancel() {} };
  await A.acceptAnswer('a2.x');
  await assert.rejects(A.acceptAnswer('a2.y'), (e) => e.used === true);
});

// ----- D-005 (partie restée) / D-010 : retour par le secret local

test('D-005/D-010 : un joueur revient avec son secret, sans devenir un nouveau joueur', async () => {
  const { players: [A] } = newGame(2);
  A.state.players.p1.secretHash = await sha256('mon-secret');
  const back = fakeLink();
  await A.onHello(back, { type: 'hello', name: 'J1', gid: 'gtest', pid: 'p1', secret: 'mon-secret', secretHash: 'b'.repeat(64) });
  assert.equal(back.sent.find((m) => m.type === 'welcome')?.you, 'p1');
  assert.equal(Object.keys(A.state.players).length, 2);
  // Mauvais secret : ce n'est pas p1, il entre comme un nouveau.
  const liar = fakeLink();
  await A.onHello(liar, { type: 'hello', name: 'J1', gid: 'gtest', pid: 'p1', secret: 'faux', secretHash: 'c'.repeat(64) });
  assert.notEqual(liar.sent.find((m) => m.type === 'welcome')?.you, 'p1');
});

// ----- D-010 : plus de maître du jeu

test('D-010 : une fiche plus récente passe de proche en proche, sauf vers sa source', () => {
  const { players: [A, B] } = newGame(3);
  const l1 = fakeLink();
  const l2 = fakeLink();
  A.attach(l1, 'p1');
  A.attach(l2, 'p2');
  B.build(firstBuilding(B));
  const rec = B.snapshot().players.p1;
  A.onRecord(l1, rec);
  assert.equal(A.state.players.p1.actAt, rec.actAt, 'la plus récente gagne');
  assert.ok(l2.sent.some((m) => m.type === 'rec' && m.rec.id === 'p1'), 'relayée au voisin');
  assert.equal(l1.sent.some((m) => m.type === 'rec'), false, 'pas renvoyée à sa source');
  // Une fiche plus ancienne est ignorée.
  l2.sent.length = 0;
  A.onRecord(l1, { ...rec, actAt: rec.actAt - 5, name: 'Vieux' });
  assert.equal(A.state.players.p1.name, 'J1');
  assert.equal(l2.sent.length, 0);
});

test('D-010 : plus de relève ni d’époques dans une copie reçue', () => {
  const { players: [A, B] } = newGame(2);
  A.mergeIn({ ...B.snapshot(), leader: 'p1', epoch: 5, nextRank: 9 }, { pid: 'p1' });
  for (const k of ['leader', 'epoch', 'nextRank']) assert.equal(k in A.state, false, k);
});

// ----- D-007 : sauvegarde locale, reprise, fusion des copies

test('D-007 : la partie est sauvegardée à chaque changement', () => {
  const { players: [A] } = newGame(1);
  A.build(firstBuilding(A));
  const saved = JSON.parse(localStorage.getItem('astra.save'));
  assert.equal(saved.v, 1);
  assert.equal(saved.me, 'p0');
  assert.equal(saved.state.players.p0.actAt, P(A).actAt);
});

test('D-007 : la reprise rattrape le temps écoulé', () => {
  const t0 = Date.now() - 6 * 3_600_000; // partie laissée il y a 6 h
  const s = new Session('J0');
  Object.assign(s, { now: () => t0, start() {}, meet() {}, me: 'p0', status: 'playing' });
  s.state = { gid: 'gresume', key: 'k', players: {}, log: [] };
  s.addPlayer('p0', 'J0', 'x'.repeat(64));
  s.chooseRace('human');
  s.claimPlanet(s.planets[0].id);
  const key = firstBuilding(s);
  P(s).planet.stock = { minerals: 1e6, food: 1e6, energy: 1e6 };
  const level = P(s).planet.levels[key] || 0;
  s.build(key);
  assert.ok(P(s).planet.queue, 'chantier en cours');
  const saved = { v: 1, me: 'p0', savedAt: t0, state: JSON.parse(JSON.stringify(s.state)) };
  const start = Session.prototype.start;
  Session.prototype.start = () => {}; // pas de minuteurs ni de rendez-vous dans Node
  try {
    const r = Session.resume(saved);
    assert.equal(P(r).planet.queue, null, 'le chantier fini pendant l’absence est terminé');
    assert.equal(P(r).planet.levels[key], level + 1);
  } finally {
    Session.prototype.start = start;
  }
});

test('D-007 : fusion de deux copies, la plus récente action par joueur gagne', () => {
  const base = { gid: 'g', players: { a: { id: 'a', rank: 0, actAt: 10, name: 'A-base', online: true }, b: { id: 'b', rank: 1, actAt: 50, name: 'B-base' } }, log: [{ at: 1, text: 'x' }] };
  const other = { gid: 'g', players: { a: { id: 'a', rank: 0, actAt: 20, name: 'A-autre' }, b: { id: 'b', rank: 1, actAt: 50, name: 'B-autre' }, c: { id: 'c', rank: 2, actAt: 5, name: 'C' } }, log: [{ at: 1, text: 'x' }, { at: 0, text: 'y' }] };
  const m = save.mergeStates(base, other);
  assert.equal(m.players.a.name, 'A-autre', 'plus récente');
  assert.equal(m.players.a.online, true, 'statut en ligne de base gardé');
  assert.equal(m.players.b.name, 'B-base', 'à égalité, base gagne');
  assert.equal(m.players.c.name, 'C', 'joueur inconnu ajouté');
  assert.deepEqual(m.log.map((l) => l.text), ['y', 'x'], 'journal : union sans doublon, trié');
  assert.equal(save.mergeStates(base, { ...other, gid: 'h' }), base, 'autre partie : rien');
});

// ----- D-066 : historique des 10 dernières parties

test('D-066 : 10 parties gardées, une nouvelle n’efface pas l’ancienne', async () => {
  await withStore(() => {
    const now = Date.now;
    let t = 1_000;
    Date.now = () => (t += 1_000);
    try {
      const st = (gid) => ({ gid, players: { me: { id: 'me', name: 'Moi', rank: 0 } }, log: [] });
      save.saveGame('me', st('g0'));
      save.saveGame('me', st('g1'));
      assert.deepEqual(save.listGames().map((x) => x.state.gid), ['g1', 'g0'], 'l’ancienne va dans l’historique');
      for (let i = 2; i <= 10; i++) save.saveGame('me', st(`g${i}`));
      const gids = save.listGames().map((x) => x.state.gid);
      assert.equal(gids.length, 10);
      assert.equal(gids.includes('g0'), false, 'la plus vieille sort');
      assert.equal(gids[0], 'g10', 'la plus récente d’abord');
    } finally {
      Date.now = now;
    }
  });
});

test('D-066 : l’identité est gardée par partie ; reprendre et oublier', async () => {
  await withStore(() => {
    const st = (gid) => ({ gid, players: { me: { id: 'me', name: 'Moi', rank: 0 } }, log: [] });
    save.saveGame('me', st('A'));
    save.saveIdentity({ gid: 'A', pid: 'pa', secret: 'sa' });
    save.saveGame('me', st('B'));
    save.saveIdentity({ gid: 'B', pid: 'pb', secret: 'sb' });
    assert.equal(save.selectGame('A').state.gid, 'A');
    assert.equal(save.loadGame().state.gid, 'A');
    assert.deepEqual(save.loadIdentity(), { gid: 'A', pid: 'pa', secret: 'sa' });
    save.forgetGame('A');
    assert.equal(save.loadGame(), null);
    assert.deepEqual(save.listGames().map((x) => x.state.gid), ['B']);
    assert.equal(save.selectGame('A'), null);
    assert.equal(JSON.parse(localStorage.getItem('astra.identities')).A, undefined, 'son identité aussi');
  });
});

// ----- D-045 / D-049 / D-050 : journal des ordres

test('D-045 : un ordre refusé est noté et date la fiche', () => {
  const { players: [A] } = newGame(1);
  const n = P(A).orders.length;
  const before = P(A).actAt;
  assert.equal(A.build('inconnu'), undefined);
  assert.equal(P(A).orders.length, n + 1);
  assert.equal(P(A).orders.at(-1).k, 'build');
  assert.deepEqual(P(A).orders.at(-1).a, ['inconnu']);
  assert.ok(P(A).actAt > before, 'nouvel actAt pour que les autres l’adoptent');
});

test('D-049 : chaque entrée note ce que le joueur avait reçu des autres', () => {
  const { players: [A, B], sync } = newGame(2);
  B.build(firstBuilding(B));
  sync(A, B);
  A.build(firstBuilding(A));
  assert.equal(P(A).orders.at(-1).s?.p1, P(B).orders.length);
  A.build('inconnu'); // rien de neuf chez B : pas de `s`
  assert.equal(P(A).orders.at(-1).s, undefined);
});

test('D-050 : journal plafonné à 1 500 entrées, les plus anciennes s’effacent', () => {
  assert.equal(MAX_ORDERS, 1500);
  const { players: [A] } = newGame(1);
  P(A).orders = Array.from({ length: 1499 }, (_, i) => ({ t: i, k: 'tick' }));
  A.build('inconnu');
  A.build('inconnu');
  assert.equal(P(A).orders.length, 1500);
  assert.equal(P(A).orders[0].t, 1, 'la plus vieille entrée est partie');
});

// ----- D-009 : rendez-vous propre à la partie

test('D-009 : au rendez-vous, seuls les joueurs de la même partie sont reliés', () => {
  const linked = [];
  const sent = [];
  const rdv = new Rendezvous({ gid: 'g1', key: 'k', me: 'moi', onLink: (link, pid) => linked.push(pid) });
  rdv._send = (m, to) => sent.push([to, m]);
  try {
    for (const id of ['autre', 'moi-meme', 'ok']) rdv.onPeerJoin(id);
    assert.deepEqual(sent[0], ['autre', { type: 'rdv-hello', gid: 'g1', pid: 'moi' }]);
    const links = Object.fromEntries(['autre', 'moi-meme', 'ok'].map((id) => [id, rdv.peers.get(id)]));
    rdv.onData({ type: 'sync' }, 'ok'); // avant la présentation : ignoré
    assert.equal(links.ok._queue.length, 0);
    rdv.onData({ type: 'rdv-hello', gid: 'g2', pid: 'x' }, 'autre');
    rdv.onData({ type: 'rdv-hello', gid: 'g1', pid: 'moi' }, 'moi-meme');
    rdv.onData({ type: 'rdv-hello', gid: 'g1', pid: 'p7' }, 'ok');
    assert.equal(links.autre.closed, true, 'autre partie : fermé');
    assert.equal(links['moi-meme'].closed, true, 'moi-même : fermé');
    assert.deepEqual(linked, ['p7']);
    rdv.onData({ type: 'sync' }, 'ok');
    assert.equal(links.ok._queue.length, 1, 'ensuite les messages passent');
  } finally {
    rdv.leave();
  }
});

test('D-009 : salon protégé par la clé de la partie ; le lien rendez-vous est gardé', () => {
  const { players: [A] } = newGame(2);
  assert.equal(A.gameKey, 'k');
  delete A.state.key;
  assert.equal(A.gameKey, 'k-gtest', 'parties sans clé');
  const room = fakeLink({ viaRoom: true });
  const direct = fakeLink();
  A.attach(room, 'p1');
  A.attach(direct, 'p1');
  assert.equal(A.links.get('p1'), room);
  assert.equal(direct.closed, true);
});

// ----- D-052 / D-064 : icônes nommées

test('D-052 : icônes de ressources nommées (survol et lecteur d’écran), couleur par ressource', () => {
  for (const [r, name] of [['minerals', 'Minéraux'], ['food', 'Nourriture'], ['energy', 'Énergie'], ['pop', 'Habitants']]) {
    const svg = game.resIcon(r, name);
    assert.match(svg, new RegExp(`class="ri ri-${r}"`));
    assert.match(svg, new RegExp(`aria-label="${name}"`));
    assert.match(svg, new RegExp(`<title>${name}</title>`));
    assert.doesNotMatch(svg, /undefined/);
  }
  assert.match(game.resIcon('minerals'), /<title>Minéraux<\/title>/, 'nom par défaut');
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  for (const r of ['minerals', 'food', 'energy', 'pop']) assert.match(css, new RegExp(`\\.ri-${r}\\s*\\{\\s*color:`));
});

test('D-064 : chaque icône de la page existe, et un bouton sans texte porte un nom', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const names = [...html.matchAll(/data-ic="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 20);
  for (const n of new Set(names)) {
    assert.match(ic(n), /^<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="[^"]+"\/><\/svg>$/, n);
    assert.doesNotMatch(ic(n), /undefined/, n);
  }
  // Bouton dont le seul contenu est une icône : infobulle et lecteur d'écran.
  const iconOnly = [...html.matchAll(/<button([^>]*)>\s*<i data-ic="[^"]+"><\/i>\s*<\/button>/g)];
  assert.ok(iconOnly.length > 10);
  for (const [whole, attrs] of iconOnly) {
    assert.match(attrs, /title="[^"]+"/, whole);
    assert.match(attrs, /aria-label="[^"]+"/, whole);
  }
});

// ----- D-067 / D-068 : parallaxe à l'accéléromètre

/** Lance le fond étoilé dans un faux navigateur ; renvoie ses couches et ses écouteurs. */
function galaxy({ still = false, ios = false, mode = null } = {}) {
  const saved = {};
  const fakes = {
    document: {
      createElement: () => ({ style: {}, setAttribute() {}, remove() {}, appendChild: (c) => c, getContext: () => ({ scale() {}, beginPath() {}, arc() {}, fill() {} }), toDataURL: () => 'data:' }),
      body: { prepend: () => (prepended.n += 1) },
    },
    localStorage: { getItem: () => mode, setItem() {} },
    devicePixelRatio: 1,
    innerWidth: 400,
    innerHeight: 800,
    scrollY: 0,
    matchMedia: () => ({ matches: still }),
    requestAnimationFrame: (f) => f(),
    DeviceMotionEvent: ios ? { requestPermission: () => ((perm.n += 1), Promise.resolve('granted')) } : {},
    addEventListener: (type, fn, opts) => on.push({ type, fn, opts }),
  };
  const on = [];
  const perm = { n: 0 };
  const prepended = { n: 0 };
  const divs = [];
  const make = fakes.document.createElement;
  fakes.document.createElement = (tag) => {
    const el = make();
    if (tag === 'div') divs.push(el);
    return el;
  };
  for (const k of Object.keys(fakes)) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: fakes[k], configurable: true, writable: true });
  }
  try {
    startGalaxy();
  } finally {
    for (const k of Object.keys(fakes)) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]);
      else delete globalThis[k];
    }
  }
  const layers = divs.slice(1);
  const fire = (type, e) => {
    for (const h of on.filter((x) => x.type === type)) h.fn(e);
  };
  // Les écouteurs lisent innerWidth & co. au moment de l'événement.
  const during = (fn) => {
    const live = ['innerWidth', 'innerHeight', 'scrollY', 'requestAnimationFrame', 'DeviceMotionEvent'];
    const keep = live.map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)]);
    for (const k of live) Object.defineProperty(globalThis, k, { value: fakes[k], configurable: true, writable: true });
    try {
      fn();
    } finally {
      for (const [k, d] of keep) d ? Object.defineProperty(globalThis, k, d) : delete globalThis[k];
    }
  };
  return { layers, on, perm, prepended: prepended.n, fire: (t, e) => during(() => fire(t, e)), pos: () => layers.map((l) => l.style.transform) };
}

test('D-067 : le doigt ne bouge pas les étoiles, l’accéléromètre si', () => {
  const g = galaxy();
  const rest = g.pos();
  g.fire('pointermove', { pointerType: 'touch', clientX: 390, clientY: 790 });
  assert.deepEqual(g.pos(), rest, 'glissé du doigt : rien ne bouge');
  g.fire('devicemotion', { accelerationIncludingGravity: { x: 0, y: 0 } });
  g.fire('devicemotion', { accelerationIncludingGravity: { x: 3, y: 0 } });
  assert.notDeepEqual(g.pos(), rest, 'téléphone incliné : le ciel glisse');
});

test('D-068 : sur iPhone, l’autorisation « Mouvement » est demandée au premier tap ; fond fixe si « réduire les animations »', () => {
  const g = galaxy({ ios: true });
  const tap = g.on.filter((h) => h.type === 'pointerdown');
  assert.equal(tap.length, 1);
  assert.equal(tap[0].opts?.once, true, 'une seule fois');
  assert.equal(g.perm.n, 0, 'pas avant le tap');
  g.fire('pointerdown', {});
  assert.equal(g.perm.n, 1);

  const still = galaxy({ still: true, ios: true });
  assert.deepEqual(still.on.map((h) => h.type), ['resize'], 'ni défilement, ni capteur, ni souris');
  const rest = still.pos();
  still.fire('devicemotion', { accelerationIncludingGravity: { x: 3, y: 3 } });
  assert.deepEqual(still.pos(), rest);
});

test('D-098 : réglage « Fond » — fixe = une image sans capteurs, aucun = pas d’étoiles', () => {
  const anime = galaxy({ mode: 'anime' });
  assert.equal(anime.layers.length, 3);
  assert.ok(anime.on.some((h) => h.type === 'devicemotion'));

  const fixe = galaxy({ mode: 'fixe' });
  assert.equal(fixe.layers.length, 1, 'les trois couches dans une seule image');
  assert.deepEqual(fixe.on.map((h) => h.type), ['resize'], 'ni défilement, ni capteur, ni souris');

  const aucun = galaxy({ mode: 'aucun' });
  assert.equal(aucun.prepended, 0, 'rien n’est ajouté à la page');
  assert.equal(aucun.on.length, 0);

  assert.equal(galaxy({ mode: 'n’importe quoi' }).layers.length, 3, 'valeur inconnue : animé');
});
