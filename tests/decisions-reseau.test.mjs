// Décisions du domaine réseau (docs/decisions.md) : invitations, fiches,
// sauvegarde et historique, journal des ordres, rendez-vous, icônes, fond étoilé.
// Chaque test dit ce que la doc décide, pas seulement ce que fait le code.
//
// Tous sont écrits en scénarios (D-129) : en cas d'échec, le rapport
// tests/reports/decisions-reseau.test.html montre la partie vue par le joueur concerné. Ceux qui
// vérifient une fonction pure (fusion, historique, rendez-vous, icônes, fond) montrent la partie
// où le joueur les rencontre, et les valeurs vérifiées en étiquettes (D-143) ; les asserts restent.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newGame, game, Session } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { MAX_ORDERS } = await import('../js/session.js');
const save = await import('../js/save.js');
const { Rendezvous } = await import('../js/rendezvous.js');
const { ic } = await import('../js/icons.js');
const { startGalaxy } = await import('../js/galaxy.js');
const scenario = scenarios(import.meta.url);

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

/**
 * Une partie à un joueur, datée de maintenant (Date.now) : une fois sauvegardée, Session.resume
 * la reprend sans rattraper des années de temps de jeu.
 */
function soloNow(gid) {
  const t = Date.now();
  const s = new Session('J0');
  Object.assign(s, { now: () => t, start() {}, meet() {}, me: 'p0', status: 'playing' });
  s.state = { gid, key: 'k', players: {}, log: [] };
  s.addPlayer('p0', 'J0', 'x'.repeat(64));
  s.chooseRace('human');
  s.claimPlanet(s.planets[0].id);
  return s;
}

/** Reprend la sauvegarde `saved` comme au lancement de l'appli, sans minuteurs ni rendez-vous. */
function resumeQuiet(saved) {
  const start = Session.prototype.start;
  Session.prototype.start = () => {};
  try {
    return Session.resume(saved);
  } finally {
    Session.prototype.start = start;
  }
}

// ----- D-006 : les deux scans valent accord, 8 joueurs au plus, invitation à usage unique

scenario('D-006 : un nouveau venu entre sans validation de l’hôte', async (film) => {
  const { players: [A] } = newGame(2);
  film.look(A, 'partie à deux, avant l’arrivée de Zoé');
  const link = fakeLink();
  await A.onHello(link, { type: 'hello', name: 'Zoé', secretHash: 'a'.repeat(64) });
  const welcome = link.sent.find((m) => m.type === 'welcome');
  film.look(A, 'Zoé dit bonjour : elle entre tout de suite', [
    { show: 'réponse à Zoé', expected: 'welcome', got: link.sent.map((m) => m.type).join(', ') || 'rien', ok: !!welcome },
    { show: 'nom du nouveau joueur', expected: 'Zoé', got: welcome && A.state.players[welcome.you].name },
    { show: 'joueurs', expected: 3, got: Object.keys(A.state.players).length },
  ]);
  assert.ok(welcome, 'welcome envoyé tout de suite');
  assert.equal(A.state.players[welcome.you].name, 'Zoé');
  assert.equal(Object.keys(A.state.players).length, 3);
});

scenario('D-006 : 8 joueurs au plus, le 9e est refusé', async (film) => {
  const { players: [A] } = newGame(8);
  film.look(A, 'partie pleine : 8 joueurs');
  const link = fakeLink();
  await A.onHello(link, { type: 'hello', name: 'Neuf', secretHash: 'a'.repeat(64) });
  const refused = link.sent.find((m) => m.type === 'refused');
  film.look(A, 'un 9e dit bonjour : refusé', [
    { show: 'messages au 9e', expected: 'refused, sans welcome', got: link.sent.map((m) => m.type).join(', ') || 'rien', ok: !!refused && !link.sent.some((m) => m.type === 'welcome') },
    { show: 'raison', expected: 'parle des 8 joueurs', got: refused?.reason, ok: /8/.test(refused?.reason) },
    { show: 'joueurs', expected: 8, got: Object.keys(A.state.players).length },
  ]);
  assert.ok(refused, 'refused envoyé');
  assert.match(refused.reason, /8/);
  assert.equal(link.sent.some((m) => m.type === 'welcome'), false);
  assert.equal(Object.keys(A.state.players).length, 8);
});

scenario('D-006 : une invitation ne sert qu’une fois', async (film) => {
  const { players: [A] } = newGame(1);
  film.look(A, 'A seul, une invitation prête');
  A.invite = { accept: async () => fakeLink(), cancel() {} };
  await A.acceptAnswer('a2.x');
  film.look(A, 'première réponse acceptée ; la seconde sera refusée');
  let err = null;
  await assert.rejects(A.acceptAnswer('a2.y'), (e) => ((err = e), e.used === true));
  film.look(A, 'seconde réponse à la même invitation : refusée', [{ show: 'seconde réponse', expected: 'refusée, invitation déjà utilisée', got: err?.used ? 'refusée, invitation déjà utilisée' : 'acceptée' }]);
});

// ----- D-005 (partie restée) / D-010 : retour par le secret local

scenario('D-005/D-010 : un joueur revient avec son secret, sans devenir un nouveau joueur', async (film) => {
  const { players: [A] } = newGame(2);
  A.state.players.p1.secretHash = await sha256('mon-secret');
  film.look(A, 'B (p1) est parti ; A garde sa place');
  const back = fakeLink();
  await A.onHello(back, { type: 'hello', name: 'J1', gid: 'gtest', pid: 'p1', secret: 'mon-secret', secretHash: 'b'.repeat(64) });
  film.look(A, 'B revient avec son secret : toujours deux joueurs', [
    { show: 'B revient comme', at: A.state.players.p1.home, expected: 'p1', got: back.sent.find((m) => m.type === 'welcome')?.you },
    { show: 'joueurs', expected: 2, got: Object.keys(A.state.players).length },
  ]);
  assert.equal(back.sent.find((m) => m.type === 'welcome')?.you, 'p1');
  assert.equal(Object.keys(A.state.players).length, 2);
  // Mauvais secret : ce n'est pas p1, il entre comme un nouveau.
  const liar = fakeLink();
  await A.onHello(liar, { type: 'hello', name: 'J1', gid: 'gtest', pid: 'p1', secret: 'faux', secretHash: 'c'.repeat(64) });
  const liarIs = liar.sent.find((m) => m.type === 'welcome')?.you;
  film.look(A, 'mauvais secret : il entre comme un nouveau joueur', [{ show: 'le menteur entre comme', expected: 'un autre que p1', got: liarIs, ok: liarIs !== 'p1' }]);
  assert.notEqual(liar.sent.find((m) => m.type === 'welcome')?.you, 'p1');
});

// ----- D-010 : plus de maître du jeu

scenario('D-010 : une fiche plus récente passe de proche en proche, sauf vers sa source', (film) => {
  const { players: [A, B] } = newGame(3);
  const l1 = fakeLink();
  const l2 = fakeLink();
  A.attach(l1, 'p1');
  A.attach(l2, 'p2');
  film.look(A, 'A relié à B (l1) et à C (l2)');
  B.build(firstBuilding(B));
  const rec = B.snapshot().players.p1;
  A.onRecord(l1, rec);
  film.look(A, 'A reçoit la fiche de B par l1 : il la garde et la passe à C, pas à B', [
    { show: 'fiche de B, la plus récente', at: A.state.players.p1.home, expected: true, got: A.state.players.p1.actAt === rec.actAt },
    { show: 'relayée à C (l2)', expected: true, got: l2.sent.some((m) => m.type === 'rec' && m.rec.id === 'p1') },
    { show: 'renvoyée à B (l1)', expected: false, got: l1.sent.some((m) => m.type === 'rec') },
  ]);
  assert.equal(A.state.players.p1.actAt, rec.actAt, 'la plus récente gagne');
  assert.ok(l2.sent.some((m) => m.type === 'rec' && m.rec.id === 'p1'), 'relayée au voisin');
  assert.equal(l1.sent.some((m) => m.type === 'rec'), false, 'pas renvoyée à sa source');
  // Une fiche plus ancienne est ignorée.
  l2.sent.length = 0;
  A.onRecord(l1, { ...rec, actAt: rec.actAt - 5, name: 'Vieux' });
  film.look(A, 'A reçoit une fiche plus ancienne de B, nommée « Vieux » : ignorée', [
    { show: 'nom de B chez A', at: A.state.players.p1.home, expected: 'J1', got: A.state.players.p1.name },
    { show: 'relayée à C', expected: false, got: l2.sent.length > 0 },
  ]);
  assert.equal(A.state.players.p1.name, 'J1');
  assert.equal(l2.sent.length, 0);
});

scenario('D-010 : plus de relève ni d’époques dans une copie reçue', (film) => {
  const { players: [A, B] } = newGame(2);
  film.look(A, 'au départ');
  A.mergeIn({ ...B.snapshot(), leader: 'p1', epoch: 5, nextRank: 9 }, { pid: 'p1' });
  film.look(A, 'A reçoit une copie de B avec leader, epoch et nextRank : il les jette', [
    { show: 'champs gardés', expected: [], got: ['leader', 'epoch', 'nextRank'].filter((k) => k in A.state) },
  ]);
  for (const k of ['leader', 'epoch', 'nextRank']) assert.equal(k in A.state, false, k);
});

// ----- D-007 : sauvegarde locale, reprise, fusion des copies

scenario('D-007 : la partie est sauvegardée à chaque changement', (film) => {
  const { players: [A] } = newGame(1);
  film.look(A, 'au départ');
  A.build(firstBuilding(A));
  const saved = JSON.parse(localStorage.getItem('astra.save'));
  film.look(A, 'A lance un chantier : la partie est sauvegardée', [
    { show: 'sauvegarde', expected: 'v1, joueur p0', got: `v${saved.v}, joueur ${saved.me}` },
    { show: 'chantier dans la sauvegarde', at: P(A).home, expected: true, got: saved.state.players.p0.actAt === P(A).actAt },
  ]);
  assert.equal(saved.v, 1);
  assert.equal(saved.me, 'p0');
  assert.equal(saved.state.players.p0.actAt, P(A).actAt);
});

scenario('D-007 : la reprise rattrape le temps écoulé', (film) => {
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
  film.look(s, 'il y a 6 h : chantier lancé, puis la partie est laissée', [{ show: 'chantier en cours', at: P(s).home, expected: true, got: !!P(s).planet.queue }]);
  assert.ok(P(s).planet.queue, 'chantier en cours');
  const saved = { v: 1, me: 'p0', savedAt: t0, state: JSON.parse(JSON.stringify(s.state)) };
  const start = Session.prototype.start;
  Session.prototype.start = () => {}; // pas de minuteurs ni de rendez-vous dans Node
  try {
    const r = Session.resume(saved);
    film.look(r, 'reprise de la sauvegarde, 6 h plus tard : le chantier s’est fini pendant l’absence', [
      { show: 'chantier en cours', at: P(r).home, expected: false, got: !!P(r).planet.queue },
      { show: 'niveau du bâtiment', at: P(r).home, expected: level + 1, got: P(r).planet.levels[key] },
    ]);
    assert.equal(P(r).planet.queue, null, 'le chantier fini pendant l’absence est terminé');
    assert.equal(P(r).planet.levels[key], level + 1);
  } finally {
    Session.prototype.start = start;
  }
});

scenario('D-007 : fusion de deux copies, la plus récente action par joueur gagne', (film) => {
  // Les images : A avant puis après avoir fusionné la copie de B, qui a joué entre-temps.
  // La règle de fusion est vérifiée par les asserts, sur des copies écrites à la main.
  const { players: [A, B], sync } = newGame(2);
  B.build(firstBuilding(B));
  film.look(A, 'avant la fusion : A ne sait pas que B a lancé un chantier');
  sync(A, B);
  const base = { gid: 'g', players: { a: { id: 'a', rank: 0, actAt: 10, name: 'A-base', online: true }, b: { id: 'b', rank: 1, actAt: 50, name: 'B-base' } }, log: [{ at: 1, text: 'x' }] };
  const other = { gid: 'g', players: { a: { id: 'a', rank: 0, actAt: 20, name: 'A-autre' }, b: { id: 'b', rank: 1, actAt: 50, name: 'B-autre' }, c: { id: 'c', rank: 2, actAt: 5, name: 'C' } }, log: [{ at: 1, text: 'x' }, { at: 0, text: 'y' }] };
  const m = save.mergeStates(base, other);
  film.look(A, 'après la fusion : la fiche de B, plus récente, a gagné ; en haut, la règle sur des copies écrites à la main', [
    { show: 'fiche de B chez A', at: A.state.players[B.me].home, expected: 'celle de B', got: A.state.players[B.me].actAt === P(B).actAt ? 'celle de B' : 'l’ancienne' },
    { show: 'a, plus récente', expected: 'A-autre', got: m.players.a.name },
    { show: 'b, à égalité (base gagne)', expected: 'B-base', got: m.players.b.name },
    { show: 'c, inconnu, ajouté', expected: 'C', got: m.players.c?.name },
    { show: 'journal, sans doublon, trié', expected: ['y', 'x'], got: m.log.map((l) => l.text) },
  ]);
  assert.equal(m.players.a.name, 'A-autre', 'plus récente');
  assert.equal(m.players.a.online, true, 'statut en ligne de base gardé');
  assert.equal(m.players.b.name, 'B-base', 'à égalité, base gagne');
  assert.equal(m.players.c.name, 'C', 'joueur inconnu ajouté');
  assert.deepEqual(m.log.map((l) => l.text), ['y', 'x'], 'journal : union sans doublon, trié');
  assert.equal(save.mergeStates(base, { ...other, gid: 'h' }), base, 'autre partie : rien');
});

// ----- D-066 : historique des 10 dernières parties

scenario('D-066 : 10 parties gardées, une nouvelle n’efface pas l’ancienne', async (film) => {
  // Les images : une vraie partie, puis la même reprise depuis l'historique (comme au relancement).
  // Le tri et le plafond de l'historique sont vérifiés par les asserts, sur des parties minimales.
  const real = soloNow('ghisto');
  film.look(real, 'une partie en cours, avant de passer à d’autres');
  let kept = [];
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
      kept = gids;
      assert.equal(gids.length, 10);
      assert.equal(gids.includes('g0'), false, 'la plus vieille sort');
      assert.equal(gids[0], 'g10', 'la plus récente d’abord');
    } finally {
      Date.now = now;
    }
    save.saveGame(real.me, real.state);
    film.look(resumeQuiet(save.selectGame('ghisto')), 'la partie reprise depuis l’historique ; en haut, l’historique après 11 parties', [
      { show: 'parties gardées', expected: 10, got: kept.length },
      { show: 'la plus récente d’abord', expected: 'g10', got: kept[0] },
      { show: 'la plus vieille (g0) gardée', expected: false, got: kept.includes('g0') },
    ]);
  });
});

scenario('D-066 : l’identité est gardée par partie ; reprendre et oublier', async (film) => {
  // Les images : une vraie partie, puis la même reprise depuis l'historique. Identités, reprise et
  // oubli sont vérifiés par les asserts, sur des parties minimales.
  const real = soloNow('greprise');
  film.look(real, 'une partie en cours');
  await withStore(() => {
    const st = (gid) => ({ gid, players: { me: { id: 'me', name: 'Moi', rank: 0 } }, log: [] });
    save.saveGame('me', st('A'));
    save.saveIdentity({ gid: 'A', pid: 'pa', secret: 'sa' });
    save.saveGame('me', st('B'));
    save.saveIdentity({ gid: 'B', pid: 'pb', secret: 'sb' });
    assert.equal(save.selectGame('A').state.gid, 'A');
    assert.equal(save.loadGame().state.gid, 'A');
    const id = save.loadIdentity();
    assert.deepEqual(id, { gid: 'A', pid: 'pa', secret: 'sa' });
    save.forgetGame('A');
    assert.equal(save.loadGame(), null);
    const left = save.listGames().map((x) => x.state.gid);
    assert.deepEqual(left, ['B']);
    assert.equal(save.selectGame('A'), null);
    assert.equal(JSON.parse(localStorage.getItem('astra.identities')).A, undefined, 'son identité aussi');
    const forgotten = JSON.parse(localStorage.getItem('astra.identities')).A === undefined;
    save.saveGame(real.me, real.state);
    film.look(resumeQuiet(save.selectGame('greprise')), 'la partie reprise depuis l’historique ; en haut, reprendre puis oublier la partie A', [
      { show: 'identité en reprenant A', expected: 'pa', got: id?.pid },
      { show: 'parties après avoir oublié A', expected: ['B'], got: left },
      { show: 'identité de A oubliée', expected: true, got: forgotten },
    ]);
  });
});

// ----- D-045 / D-049 / D-050 : journal des ordres

scenario('D-045 : un ordre refusé est noté et date la fiche', (film) => {
  const { players: [A] } = newGame(1);
  const n = P(A).orders.length;
  const before = P(A).actAt;
  film.look(A, 'au départ');
  assert.equal(A.build('inconnu'), undefined);
  const last = P(A).orders.at(-1);
  film.look(A, 'A ordonne de construire « inconnu » : refusé, mais noté', [
    { show: 'ordres notés', expected: n + 1, got: P(A).orders.length },
    { show: 'dernier ordre', expected: 'build inconnu', got: `${last.k} ${last.a.join(' ')}` },
    { show: 'fiche redatée', at: P(A).home, expected: true, got: P(A).actAt > before },
  ]);
  assert.equal(P(A).orders.length, n + 1);
  assert.equal(P(A).orders.at(-1).k, 'build');
  assert.deepEqual(P(A).orders.at(-1).a, ['inconnu']);
  assert.ok(P(A).actAt > before, 'nouvel actAt pour que les autres l’adoptent');
});

scenario('D-049 : chaque entrée note ce que le joueur avait reçu des autres', (film) => {
  const { players: [A, B], sync } = newGame(2);
  B.build(firstBuilding(B));
  sync(A, B);
  film.look(A, 'A reçoit la fiche de B');
  A.build(firstBuilding(A));
  film.look(A, 'A lance un chantier à son tour : l’ordre note ce qu’il avait reçu de B', [{ show: 'ordres de B reçus', at: P(A).home, expected: P(B).orders.length, got: P(A).orders.at(-1).s?.p1 }]);
  assert.equal(P(A).orders.at(-1).s?.p1, P(B).orders.length);
  A.build('inconnu'); // rien de neuf chez B : pas de `s`
  film.look(A, 'un ordre de plus, sans rien de neuf de B : rien de noté', [{ show: 'ordres reçus notés', at: P(A).home, expected: undefined, got: P(A).orders.at(-1).s }]);
  assert.equal(P(A).orders.at(-1).s, undefined);
});

scenario('D-050 : journal plafonné à 1 500 entrées, les plus anciennes s’effacent', (film) => {
  assert.equal(MAX_ORDERS, 1500);
  const { players: [A] } = newGame(1);
  P(A).orders = Array.from({ length: 1499 }, (_, i) => ({ t: i, k: 'tick' }));
  film.look(A, 'le journal de A compte 1 499 entrées');
  A.build('inconnu');
  A.build('inconnu');
  film.look(A, 'deux ordres de plus : le journal reste à 1 500', [
    { show: 'entrées', expected: MAX_ORDERS, got: P(A).orders.length },
    { show: 'première entrée (t)', expected: 1, got: P(A).orders[0].t },
  ]);
  assert.equal(P(A).orders.length, 1500);
  assert.equal(P(A).orders[0].t, 1, 'la plus vieille entrée est partie');
});

// ----- D-009 : rendez-vous propre à la partie

scenario('D-009 : au rendez-vous, seuls les joueurs de la même partie sont reliés', (film) => {
  // Le rendez-vous ne se voit pas à l'écran : l'image montre la partie dont les joueurs se
  // retrouvent (même gid) ; le tri des pairs est vérifié par les asserts.
  const { players: [A] } = newGame(2);
  film.look(A, 'A et B, de la même partie : eux seuls sont reliés au rendez-vous');
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
    film.look(A, 'au rendez-vous de g1 : seul le pair de la même partie est relié', [
      { show: 'pairs reliés', expected: ['p7'], got: linked },
      { show: 'autre partie fermée', expected: true, got: links.autre.closed },
      { show: 'moi-même fermé', expected: true, got: links['moi-meme'].closed },
      { show: 'messages du pair relié', expected: 1, got: links.ok._queue.length },
    ]);
    assert.equal(links.ok._queue.length, 1, 'ensuite les messages passent');
  } finally {
    rdv.leave();
  }
});

scenario('D-009 : salon protégé par la clé de la partie ; le lien rendez-vous est gardé', (film) => {
  const { players: [A] } = newGame(2);
  film.look(A, 'au départ, partie à clé « k »', [{ show: 'clé du salon', expected: 'k', got: A.gameKey }]);
  assert.equal(A.gameKey, 'k');
  delete A.state.key;
  assert.equal(A.gameKey, 'k-gtest', 'parties sans clé');
  const room = fakeLink({ viaRoom: true });
  const direct = fakeLink();
  A.attach(room, 'p1');
  A.attach(direct, 'p1');
  film.look(A, 'B relié deux fois à A : par le salon, puis en direct ; le salon est gardé', [
    { show: 'clé d’une partie sans clé', expected: 'k-gtest', got: A.gameKey },
    { show: 'lien gardé', at: A.state.players.p1.home, expected: 'le salon', got: A.links.get('p1') === room ? 'le salon' : 'le direct' },
    { show: 'lien direct fermé', expected: true, got: direct.closed },
  ]);
  assert.equal(A.links.get('p1'), room);
  assert.equal(direct.closed, true);
});

// ----- D-052 / D-064 : icônes nommées

scenario('D-052 : icônes de ressources nommées (survol et lecteur d’écran), couleur par ressource', (film) => {
  // L'image montre l'écran du joueur, avec ses icônes de ressources (fiche de sa planète ouverte) ;
  // le balisage des icônes et leurs couleurs sont vérifiés par les asserts.
  const { players: [A] } = newGame(1);
  film.look(A, 'A ouvre sa planète : stock en icônes de ressources', [{ sheet: P(A).home, button: true }]);
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

scenario('D-064 : chaque icône de la page existe, et un bouton sans texte porte un nom', (film) => {
  // L'image montre l'écran du joueur et ses boutons à icône ; le balisage de index.html est
  // vérifié par les asserts.
  const { players: [A] } = newGame(1);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const names = [...html.matchAll(/data-ic="([^"]+)"/g)].map((m) => m[1]);
  const drawn = [...new Set(names)].filter((n) => /^<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="[^"]+"\/><\/svg>$/.test(ic(n)) && !/undefined/.test(ic(n)));
  const bare = [...html.matchAll(/<button([^>]*)>\s*<i data-ic="[^"]+"><\/i>\s*<\/button>/g)];
  const named = bare.filter(([, attrs]) => /title="[^"]+"/.test(attrs) && /aria-label="[^"]+"/.test(attrs));
  film.look(A, 'l’écran de A, ses boutons à icône ; en haut, le compte des icônes de index.html', [
    { show: 'icônes dessinées', expected: new Set(names).size, got: drawn.length },
    { show: 'boutons à icône seule nommés', expected: bare.length, got: named.length },
  ]);
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

// ----- Fond étoilé (D-112, D-137 ; avant : parallaxe D-067 / D-068)

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

// D-067 et D-068 (parallaxe, accéléromètre) : remplacées par D-137, plus de tests.

scenario('D-137 (modifie D-112) : plus de parallaxe — une image immobile, sans capteur ni souris, pour tout le monde', (film) => {
  // L'image montre l'écran du joueur sur son fond étoilé ; le module du fond est vérifié par les
  // asserts, dans un faux navigateur.
  const { players: [A] } = newGame(1);
  // « anime » (l'ancien réglage gardé dans un téléphone), rien ou n'importe quoi : le fond fixe.
  const modes = ['fixe', 'anime', null, 'n’importe quoi'];
  const gs = modes.map((mode) => galaxy({ mode, ios: true }));
  film.look(A, 'l’écran de A sur le fond étoilé, immobile ; en haut, le fond pour les 4 réglages', [
    { show: 'images du fond', expected: [1, 1, 1, 1], got: gs.map((g) => g.layers.length) },
    { show: 'écouteurs', expected: 'resize', got: [...new Set(gs.flatMap((g) => g.on.map((h) => h.type)))].join(', ') },
    { show: 'autorisations « Mouvement »', expected: 0, got: gs.reduce((t, g) => t + g.perm.n, 0) },
  ]);
  for (const [i, mode] of modes.entries()) {
    const g = gs[i];
    assert.equal(g.layers.length, 1, `${mode} : une seule image`);
    assert.deepEqual(g.on.map((h) => h.type), ['resize'], `${mode} : ni défilement, ni capteur, ni souris`);
    assert.equal(g.perm.n, 0, `${mode} : pas d’autorisation « Mouvement » demandée`);
    const rest = g.pos();
    g.fire('devicemotion', { accelerationIncludingGravity: { x: 3, y: 3 } });
    assert.deepEqual(g.pos(), rest, `${mode} : rien ne bouge`);
  }
  const aucun = galaxy({ mode: 'aucun' });
  assert.equal(aucun.prepended, 0, 'aucun : rien n’est ajouté à la page');
  assert.equal(aucun.on.length, 0);
});
