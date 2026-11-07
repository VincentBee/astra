// Horloges des téléphones (D-165, D-166, issue #45). Toute heure est acceptée. La partie compte
// sur une heure commune : celle du créateur, que chaque joueur prend au premier battement de cœur
// (hb / hb-ack), puis avance avec l'horloge interne du navigateur (que les réglages du téléphone
// ne changent pas). Si l'heure d'un joueur a quand même changé (appli fermée), les autres le lui
// disent ; si tous ceux en ligne avec lui le disent (à deux : le créateur l'emporte), il reprend
// l'heure du groupe, et ce qu'il a fait avec sa mauvaise heure est remplacé par ce qu'ils savaient de lui.
//
// Écrits en scénarios (D-129) : en cas d'échec, le rapport tests/reports/clock.test.html montre
// ce que chaque téléphone voyait.
import assert from 'node:assert/strict';
import { newGame, newLobby, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { CLOCK_DRIFT_MS } = await import('../js/session.js');

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];
const MIN = 60_000;
const near = (a, b, ms = 1000) => Math.abs(a - b) <= ms;

/** Faux lien : passe les messages tout de suite (comme un vrai canal, sans réseau). */
function wire(a, b) {
  const end = (from, to) => ({ pid: to.me, closed: false, send: (msg) => to.links.get(from.me)?.closed === false && to.onMessage(to.links.get(from.me), JSON.parse(JSON.stringify(msg))), close() { this.closed = true; } });
  a.links.set(b.me, end(a, b));
  b.links.set(a.me, end(b, a));
}
/** Coupe le lien entre `a` et `b` (appli fermée, joueur hors ligne). */
function cut(a, b) {
  a.links.get(b.me).closed = true;
  b.links.get(a.me).closed = true;
  a.links.delete(b.me);
  b.links.delete(a.me);
}
/** `n` battements de cœur de chaque téléphone, comme heartbeat() toutes les 1,5 s. */
function beat(ss, n = 3) {
  for (let i = 0; i < n; i++) for (const s of ss) {
    for (const l of [...s.links.values()]) l.send(s.beatMsg('hb', performance.now()));
    s.checkClock();
  }
}

/**
 * Chaque téléphone a son heure (heure réelle `clock.t` + offs[i]) et son horloge interne ; le
 * créateur (J0) a l'heure commune, les autres la prendront. Pas d'heure figée : la vraie Session.now.
 */
function phones(g, offs = []) {
  g.offs = g.players.map((_, i) => offs[i] || 0);
  g.players.forEach((s, i) => {
    delete s.now;
    s.wall = () => g.clock.t + g.offs[i];
    s.mono = () => g.clock.t;
    s.clockAnchor = null;
    s.clockSynced = i === 0;
    s.toasts = [];
    s.ontoast = (t) => s.toasts.push(t);
  });
  return g;
}
const link = (g) => {
  const n = g.players.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) wire(g.players[i], g.players[j]);
};

/** Le téléphone `i` est rouvert alors que son heure a bougé de `ms` pendant qu'il était fermé. */
function reopen(g, i, ms) {
  const s = g.players[i];
  for (const o of g.players) if (o !== s && s.links.has(o.me)) cut(s, o);
  g.offs[i] += ms;
  s.clockAnchor = null; // page rechargée : l'horloge interne repart, ancrée sur l'heure (fausse) du téléphone
}

scenario('au salon, J1 en avance de 10 min prend l’heure du créateur : même heure de partie, même départ', (film) => {
  const g = phones(newLobby(2), [0, 10 * MIN]);
  const [A, B] = g.players;
  const before = B.now() - A.now();
  link(g);
  beat([A, B], 1);
  film.look(A, 'J1 avance de 10 min ; au premier battement il prend l’heure du créateur J0', [
    { show: 'écart avant (min)', expected: 10, got: Math.round(before / MIN) },
    { show: 'écart après (ms)', expected: '< 1 s', got: B.now() - A.now(), ok: near(B.now(), A.now()) },
  ]);
  assert.ok(near(before, 10 * MIN));
  assert.ok(near(B.now(), A.now()));
  assert.equal(B.clockSynced, true);
  assert.equal(A.ready(), true);
  assert.equal(B.ready(), true);
  beat([A, B], 3);
  g.sync(A, B);
  g.sync(B, A);
  assert.equal(A.checkStart(), true);
  g.sync(B, A);
  assert.equal(A.startedAt, B.startedAt);
  assert.deepEqual(A.clockVotes, {});
  assert.deepEqual(B.clockVotes, {});
});

scenario('#45 : J1 en avance de 10 min au départ, le froid prend une case à la même heure sur les deux téléphones', (film) => {
  Object.assign(game.FROST, { delayMs: 0, durationMs: 30 * MIN });
  try {
  const g = phones(newLobby(2), [0, 10 * MIN]);
  const [A, B] = g.players;
  link(g);
  beat([A, B], 3);
  A.ready();
  B.ready();
  g.sync(A, B);
  g.sync(B, A);
  A.checkStart();
  g.sync(B, A);
  const cell = { x: 1, y: 1 };
  const t = A.frostOf(cell);
  // Le téléphone en avance (J1 ici) ne voit pas le gel plus tôt : à l'heure réelle t − 1 min, la case n'est gelée pour personne.
  g.clock.t += t - A.now() - MIN;
  const frozenA = A.frostOf(cell) <= A.now();
  const frozenB = B.frostOf(cell) <= B.now();
  film.look(A, '1 min avant le gel d’une case : ni J0 ni J1 (en avance de 10 min) ne la voient gelée', [
    { show: 'gelée chez J0', expected: false, got: frozenA },
    { show: 'gelée chez J1', expected: false, got: frozenB },
  ]);
  assert.equal(B.frostOf(cell), t);
  assert.equal(frozenA, false);
  assert.equal(frozenB, false);
  } finally {
    Object.assign(game.FROST, { delayMs: Infinity, durationMs: 24 * MIN });
  }
});

scenario('changer l’heure du téléphone page ouverte ne change pas l’heure de la partie', (film) => {
  const g = phones(newLobby(2));
  const [A, B] = g.players;
  link(g);
  beat([A, B], 3);
  const t = B.now();
  g.offs[1] += 10 * MIN; // B avance son téléphone de 10 min
  beat([A, B], 5);
  film.look(B, 'B avance son téléphone de 10 min, appli ouverte', [
    { show: 'heure de partie chez B', expected: 'inchangée', got: B.now() - t, ok: B.now() === t },
    { show: 'messages « ton heure a changé »', expected: 0, got: Object.keys(A.clockVotes).length + Object.keys(B.clockVotes).length },
  ]);
  assert.equal(B.now(), t);
  assert.deepEqual(A.clockVotes, {});
  assert.deepEqual(B.clockVotes, {});
});

scenario('consensus à 3 : l’heure de J2 a changé appli fermée, J0 et J1 le lui disent, il est resynchronisé avec ce qu’ils savaient de lui', (film) => {
  const g = phones(newGame(3));
  const [A, B, C] = g.players;
  link(g);
  beat([A, B, C], 3);
  g.clock.t += 5_000;
  C.tick();
  g.sync(A, C);
  g.sync(B, C);
  const good = JSON.parse(JSON.stringify(A.state.players[C.me]));
  const epochs = [A.clockEpoch, B.clockEpoch];
  reopen(g, 2, 10 * MIN); // C rouvre l'appli avec son téléphone en avance de 10 min
  const key = Object.keys(game.RACES[P(C).race].buildings)[0];
  C.build(key); // fait avec la mauvaise heure : chantier daté du futur
  const bad = JSON.parse(JSON.stringify(P(C)));
  assert.ok(bad.actAt > A.now() + 9 * MIN);
  wire(A, C);
  wire(B, C);
  g.sync(A, C); // sa fiche arrive avant que son heure soit mesurée : adoptée (toute heure est acceptée)
  g.sync(B, C);
  assert.equal(A.state.players[C.me].actAt, bad.actAt);
  beat([A, B, C], 3);
  const seenA = A.state.players[C.me];
  film.look(A, 'J0 et J1 voient l’heure de J2 en avance de 10 min et le lui disent : J2 reprend leur heure et sa fiche d’avant', [
    { show: 'heure de J2 − heure de J0', expected: '< 1 s', got: C.now() - A.now(), ok: near(C.now(), A.now()) },
    { show: 'chantier fait avec la mauvaise heure', expected: 'effacé', got: seenA.planet.queue ? 'encore là' : 'effacé', ok: !seenA.planet.queue && !P(C).planet.queue },
    { show: 'fiche de J2 chez J0 resynchronisée (clockFix)', expected: 1, got: seenA.clockFix },
  ]);
  assert.ok(near(C.now(), A.now()));
  assert.equal(P(C).clockFix, 1);
  assert.equal(P(C).planet.queue, good.planet.queue);
  for (const s of [A, B]) {
    assert.equal(s.state.players[C.me].clockFix, 1, `${s.name} a la fiche resynchronisée`);
    assert.ok(s.state.players[C.me].actAt < bad.actAt);
  }
  assert.match(C.toasts.at(-1), /reprendre|repris leur heure/);
  // J0 et J1 ne se sont pas corrigés : un seul vote chacun (celui de J2), pas tous les autres.
  assert.deepEqual([A.clockEpoch, B.clockEpoch], epochs);
  // Une fiche de J2 d'avant la resynchronisation, relayée en retard, ne repasse plus.
  B.onRecord(B.links.get(A.me), bad);
  assert.equal(B.state.players[C.me].clockFix, 1);
});

scenario('duel à 2 : l’heure de J1 a changé, les deux s’accusent, le créateur J0 l’emporte', (film) => {
  const g = phones(newGame(2));
  const [A, B] = g.players;
  link(g);
  beat([A, B], 3);
  reopen(g, 1, -10 * MIN); // J1 rouvre avec son téléphone en retard de 10 min
  wire(A, B);
  beat([A, B], 3);
  film.look(A, 'J0 (créateur) et J1 se disent « ton heure a changé » : J1 se resynchronise, J0 garde son heure', [
    { show: 'écart J1 − J0', expected: '< 1 s', got: B.now() - A.now(), ok: near(B.now(), A.now()) },
    { show: 'corrections chez J0', expected: 0, got: A.clockEpoch },
  ]);
  assert.ok(near(B.now(), A.now()));
  assert.equal(A.clockEpoch, 0);
  assert.equal(P(B).clockFix, 1);
});

scenario('duel à 2 : c’est l’heure du créateur qui a changé, il l’emporte quand même', () => {
  const g = phones(newGame(2));
  const [A, B] = g.players;
  link(g);
  beat([A, B], 3);
  reopen(g, 0, 10 * MIN);
  wire(A, B);
  beat([A, B], 3);
  assert.ok(near(B.now(), A.now()));
  assert.equal(A.clockEpoch, 0);
  assert.ok(near(B.now(), g.clock.t + 10 * MIN));
});

scenario('un joueur hors ligne ne vote pas : à 3 avec J2 absent, c’est un duel entre J0 et J1', () => {
  const g = phones(newGame(3));
  const [A, B, C] = g.players;
  link(g);
  beat([A, B, C], 3);
  cut(B, C);
  cut(A, C);
  reopen(g, 1, 10 * MIN);
  wire(A, B);
  beat([A, B], 3);
  assert.ok(near(B.now(), A.now()));
  assert.equal(A.clockEpoch, 0);
});

scenario('un écart de moins de 10 s (bruit de mesure) ne déclenche rien', () => {
  const g = phones(newGame(2));
  const [A, B] = g.players;
  link(g);
  beat([A, B], 3);
  reopen(g, 1, 5_000);
  wire(A, B);
  beat([A, B], 5);
  assert.ok(5_000 < CLOCK_DRIFT_MS);
  assert.deepEqual(A.clockVotes, {});
  assert.deepEqual(B.clockVotes, {});
});

scenario('une IA de ce téléphone (lien local) n’est jamais comparée et ne vote pas', () => {
  const { players: [A] } = newLobby(1);
  A.links.set('bot1', { pid: 'bot1', local: true, closed: false, send() {}, close() {} });
  for (let i = 0; i < 3; i++) A.onMessage(A.links.get('bot1'), { type: 'hb-ack', t0: performance.now(), w0: A.now(), w: A.now() + 10 * MIN, sy: true, ep: 0 });
  assert.equal(A.links.get('bot1').skew, undefined);
  assert.equal(A.checkClock(), false);
  assert.equal(A.ready(), true);
});

scenario('un téléphone d’avant, qui ne renvoie pas son heure, ne bloque rien', () => {
  const { players: [A, B] } = newLobby(2);
  A.links.set(B.me, { pid: B.me, closed: false, send() {}, close() {} });
  A.onMessage(A.links.get(B.me), { type: 'hb-ack', t0: performance.now() }); // ni w ni w0
  assert.equal(A.links.get(B.me).noClock, true);
  assert.equal(A.ready(), true);
});
