// Joueurs IA (D-151) : une IA est une Session comme une autre, qui joue sur le téléphone de
// l'hôte avec les ordres de l'interface. Ces scénarios la font arriver dans le salon, partir,
// fonder sa planète, développer son empire, se battre jusqu'à la fin de la partie ; ils
// vérifient aussi que l'hôte la sauve, la réveille à la reprise, et que tout se rejoue.
import { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Session, newLobby, game, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { think, addBot, wakeBots, PEACE_MS } = await import('../js/bot.js');
const { loadGame } = await import('../js/save.js');
const { replay, replayable } = await import('../js/replay.js');

const scenario = scenarios(import.meta.url);
const MIN = 60_000;

afterEach(() => {
  game.FROST.delayMs = Infinity;
});

const me = (s) => s.state.players[s.me];
/** Laisse passer les messages du lien en mémoire entre l'hôte et ses IA. */
const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * L'hôte : un joueur seul dans sa partie, qui a choisi sa race, comme après « Contre l'IA ». Son
 * horloge est `clock` ; `online` vient des liens (ses IA y seront reliées).
 */
function host(clock, race = 'human') {
  const s = new Session('Vincent');
  Object.assign(s, { now: () => s.entry?.t ?? clock.t, start() {}, meet() {}, me: 'p0', status: 'playing' });
  s.state = { gid: 'gtest', key: 'k', players: {}, log: [] };
  s.addPlayer(s.me, s.name, 'x'.repeat(64));
  s.chooseRace(race);
  return s;
}

/** Fait tourner l'hôte et ses IA pendant `ms`, par pas de 1 s (une réflexion toutes les 3 s). */
async function run(h, clock, ms) {
  const bots = [...h.bots.values()];
  for (let t = 0; t < ms; t += 1000) {
    clock.t += 1000;
    h.tick();
    h.checkStart();
    for (const b of bots) {
      b.tick();
      b.checkStart();
      if (t % 3000 === 0) think(b);
    }
    await flush();
  }
}

scenario('D-151 : ajoutée par l’hôte, l’IA choisit sa race et se dit prête ; la partie part quand l’hôte est prêt', async (film) => {
  const clock = { t: 10_000_000 };
  const h = host(clock);
  const bot = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  const b = h.state.players[bot.me];
  film.look(h, 'l’hôte ajoute une IA : elle arrive dans sa partie, prête', [
    { show: 'joueurs chez l’hôte', expected: 2, got: Object.keys(h.state.players).length },
    { show: 'nom de l’IA', expected: true, got: b.name.startsWith('IA ') },
    { show: 'race de l’IA', expected: true, got: !!b.race },
    { show: 'IA prête', expected: true, got: Number.isFinite(b.ready) },
    { show: 'IA en ligne', expected: true, got: b.online },
    { show: 'départ', expected: null, got: h.startedAt },
  ]);
  assert.equal(Object.keys(h.state.players).length, 2);
  assert.ok(b.race && Number.isFinite(b.ready) && b.online, 'race choisie, prête, en ligne');
  assert.equal(h.startedAt, null, 'l’hôte n’est pas encore prêt');
  assert.deepEqual(h.notReady.map((p) => p.id), ['p0'], 'seul l’hôte manque');

  assert.ok(h.ready());
  assert.ok(h.checkStart(), 'tous les présents sont prêts : départ');
  await flush();
  await run(h, clock, 3000);
  film.look(bot, 'départ : chacun a son colonisateur, celui de l’IA part fonder sa planète', [
    { show: 'départ vu par l’IA', expected: h.startedAt, got: bot.startedAt },
    { show: 'ordre du colonisateur de l’IA', expected: 'colonize', got: me(bot).fleets[0]?.order?.kind ?? null },
  ]);
  assert.equal(bot.startedAt, h.startedAt);
  assert.equal(me(bot).fleets[0].order.kind, 'colonize');
});

scenario('D-151 : l’IA fonde sa planète, construit et cherche ; l’hôte voit sa fiche et la sauve avec la liste de ses IA', async (film) => {
  const clock = { t: 10_000_000 };
  const h = host(clock);
  const bot = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  h.ready();
  h.checkStart();
  await run(h, clock, 6 * MIN);
  const b = h.state.players[bot.me];
  const levels = Object.values(b.planet?.levels || {}).reduce((t, n) => t + n, 0);
  film.look(h, 'après 6 min, chez l’hôte : la planète de l’IA a grandi', [
    { show: 'planète mère de l’IA', at: b.home, expected: true, got: !!b.home },
    { show: 'niveaux de bâtiments', expected: true, got: levels >= 8, ok: levels >= 8 },
    { show: 'labo', expected: true, got: (b.planet?.levels.lab || 0) >= 1 },
    { show: 'fiche à jour chez l’hôte', expected: me(bot).actAt, got: b.actAt },
  ]);
  assert.ok(b.home, 'planète mère fondée');
  assert.ok(levels >= 8, `bâtiments construits (${levels} niveaux)`);
  assert.ok(b.planet.levels.lab >= 1, 'un labo');
  assert.equal(b.actAt, me(bot).actAt, 'l’hôte a la dernière fiche de l’IA');
  // Les ordres de l'IA sont tous notés : la partie se rejoue.
  assert.equal(b.orders[0].k, 'chooseRace');

  h.save();
  const saved = loadGame();
  film.look(h, 'sauvegarde de l’hôte : la partie, et l’IA qu’il fait jouer', [
    { show: 'IA dans la sauvegarde', expected: [bot.me], got: saved.bots },
    { show: 'fiche de l’IA sauvée', expected: true, got: !!saved.state.players[bot.me]?.home },
  ]);
  assert.deepEqual(saved.bots, [bot.me]);
  assert.ok(saved.state.players[bot.me].home);
  h.end();
});

scenario('D-151 : à la reprise, l’IA se réveille sur le téléphone de l’hôte et reprend sa partie', async (film) => {
  const clock = { t: 10_000_000 };
  const h = host(clock, 'machine');
  const bot = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  h.ready();
  h.checkStart();
  await run(h, clock, 2 * MIN);
  h.end();
  const before = h.state.players[bot.me].orders.length;
  // La reprise (Session.resume) rejoint le rendez-vous : coupé ici, comme dans le banc d'essai.
  // Son passage de rattrapage se fait à l'heure du test.
  const { start, meet, now } = Session.prototype;
  Object.assign(Session.prototype, { start() {}, meet() {}, now() { return this.entry?.t ?? clock.t; } });
  let r;
  try {
    r = Session.resume(loadGame());
  } finally {
    Object.assign(Session.prototype, { start, meet, now });
  }
  r.now = () => r.entry?.t ?? clock.t;
  const woke = wakeBots(r, { timers: false, clock: () => clock.t });
  await flush();
  film.look(r, 'reprise : l’IA est de nouveau reliée à l’hôte', [
    { show: 'IA réveillées', expected: [bot.me], got: woke.map((x) => x.me) },
    { show: 'IA en ligne', expected: true, got: r.state.players[bot.me].online },
  ]);
  assert.deepEqual(woke.map((x) => x.me), [bot.me]);
  assert.equal(r.state.players[bot.me].online, true);
  await run(r, clock, 2 * MIN);
  const after = r.state.players[bot.me].orders.length;
  film.look(r, 'deux minutes plus tard : l’IA a continué à jouer', [{ show: 'ordres de l’IA', expected: true, got: after > before, ok: after > before }]);
  assert.ok(after > before, `de nouveaux ordres (${before} → ${after})`);
  // Réveiller deux fois ne crée pas une deuxième IA.
  assert.equal(wakeBots(r, { timers: false }).length, 0);
  r.end();
  assert.equal(r.state.players[bot.me].online, false, 'l’hôte parti, l’IA s’arrête avec lui');
});

scenario('D-151 : trois IA jouent une partie entière, sans conquête avant 10 min, jusqu’à un gagnant ; elle se rejoue à l’identique', (film) => {
  game.FROST.delayMs = 12 * MIN;
  const { players, clock, sync } = newLobby(3, ['human', 'machine', 'alien']);
  const all = () => {
    for (const a of players) for (const b of players) if (a !== b) sync(a, b);
  };
  film.look(players[0], 'salon : trois IA, une par race');
  const start = clock.t;
  for (let step = 0; step < 45 * 20 && !players[0].over; step++) {
    for (const s of players) {
      s.tick();
      s.checkStart();
      think(s);
    }
    all();
    clock.t += 3000;
    if (step === 3 * 20) {
      film.look(players[0], '3 min : chacun a fondé sa planète mère', players.map((s) => ({ show: `planète de ${s.name}`, at: me(s).home, expected: true, got: !!me(s).home })));
      for (const s of players) assert.ok(me(s).home, `${s.name} a sa planète`);
    }
  }
  for (const s of players) s.tick();
  all();
  const state = clone(players[0].snapshot());
  const orders = Object.values(state.players).flatMap((p) => p.orders.map((o) => ({ ...o, who: p.name })));
  const conquests = orders.filter((o) => o.k === 'moveFleet' && o.a?.[2] === 'conquer');
  const firstWar = Math.min(...conquests.map((o) => o.t));
  const colonies = Object.values(state.players).some((p) => orders.some((o) => o.who === p.name && o.k === 'moveFleet' && o.a?.[2] === 'colonize' && o.t > (p.claimAt || Infinity)));
  const over = players[0].over;
  film.look(players[0], 'fin de la partie', [
    { show: 'partie finie', expected: true, got: !!over },
    { show: 'gagnant', expected: true, got: !!over?.winner },
    { show: 'des colonies fondées', expected: true, got: colonies },
    { show: 'des conquêtes tentées', expected: true, got: conquests.length > 0 },
    { show: 'première conquête après la trêve', expected: true, got: firstWar - players[0].startedAt >= PEACE_MS },
    { show: 'ordres de chaque IA ≤ 1 500', expected: true, got: Object.values(state.players).every((p) => p.orders.length < 1500) },
  ]);
  assert.ok(over, 'la partie finit');
  assert.ok(over.winner, 'un gagnant');
  assert.ok(over.at - start < 45 * MIN);
  assert.ok(colonies, 'des colonies');
  assert.ok(conquests.length > 0, 'des conquêtes');
  assert.ok(firstWar - players[0].startedAt >= PEACE_MS, 'pas de conquête pendant la trêve');

  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  film.look(players[0], 'la copie de J0 rejouée : chaque fiche retombe à l’identique', Object.values(state.players).map((p) => ({ show: `fiche de ${p.name} rejouée`, expected: true, got: r.faithful[p.id] })));
  for (const p of Object.values(state.players)) assert.equal(r.faithful[p.id], true, `fiche de ${p.name}`);
});

scenario('D-220 : la page de l’hôte se fige 31 s ; le lien de l’IA ne se coupe pas, elle continue de jouer et rien n’est perdu à la reprise', async (film) => {
  const clock = { t: 10_000_000 };
  const h = host(clock);
  const bot = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  h.ready();
  h.checkStart();
  await run(h, clock, MIN);
  const b = () => h.state.players[bot.me];
  const before = { actAt: b().actAt, orders: b().orders.length };
  // La page se fige : 31 s sans un seul message, puis le battement de cœur passe le premier
  // au réveil (modèle d'un téléphone verrouillé, issue #38). L'heure de `performance.now`, que
  // lit `heartbeat`, est indépendante de l'horloge du test.
  const real = performance.now.bind(performance);
  let skew = 0;
  performance.now = () => real() + skew;
  try {
    skew = 31_000;
    clock.t += 31_000;
    h.heartbeat();
    await flush();
    film.look(h, 'réveil après 31 s : chez l’hôte, l’IA est toujours en ligne (avant D-220 : lien fermé, « Seul en ligne »)', [
      { show: 'liens de l’hôte', expected: 1, got: h.links.size },
      { show: 'IA en ligne', expected: true, got: b().online },
      { show: 'bandeau « Seul en ligne »', expected: false, got: h.alone },
    ]);
    assert.equal(h.links.size, 1, 'le lien en mémoire n’est pas fermé pour silence');
    assert.equal(b().online, true);
    assert.equal(h.alone, false, 'pas de « Seul en ligne · Rejoindre » avec une IA de ce téléphone');
    // Les liens WebRTC, eux, se coupent toujours après 30 s de silence.
    const other = { send() {}, close() { this.closed = true; h.links.delete('pX'); }, lastSeen: real() + skew - 31_000 };
    h.links.set('pX', other);
    h.heartbeat();
    assert.equal(other.closed, true, 'un lien réseau muet depuis 31 s est fermé');
    assert.equal(h.links.size, 1);
  } finally {
    performance.now = real;
  }
  await run(h, clock, MIN);
  const after = { actAt: b().actAt, orders: b().orders.length };
  film.look(h, 'une minute plus tard : la fiche de l’IA avance de nouveau chez l’hôte', [
    { show: 'actAt avance', expected: true, got: after.actAt > before.actAt, ok: after.actAt > before.actAt },
    { show: 'ordres de l’IA', expected: true, got: after.orders > before.orders, ok: after.orders > before.orders },
    { show: 'copie de l’hôte = Session de l’IA', expected: me(bot).orders.length, got: after.orders },
  ]);
  assert.ok(after.actAt > before.actAt, `actAt avance (${before.actAt} → ${after.actAt})`);
  assert.ok(after.orders > before.orders, `de nouveaux ordres (${before.orders} → ${after.orders})`);
  assert.equal(after.orders, me(bot).orders.length, 'l’hôte a tous les ordres joués par l’IA');

  // Rechargement : la partie reprend depuis la sauvegarde de l'hôte, l'IA se réveille.
  const played = me(bot).orders.length;
  h.end();
  const { start, meet, now } = Session.prototype;
  Object.assign(Session.prototype, { start() {}, meet() {}, now() { return this.entry?.t ?? clock.t; } });
  let r;
  try {
    r = Session.resume(loadGame());
  } finally {
    Object.assign(Session.prototype, { start, meet, now });
  }
  r.now = () => r.entry?.t ?? clock.t;
  wakeBots(r, { timers: false, clock: () => clock.t });
  await flush();
  const kept = r.state.players[bot.me].orders.length;
  film.look(r, 'après rechargement : aucun ordre joué par l’IA n’est perdu', [
    { show: 'ordres de l’IA gardés', expected: played, got: kept },
    { show: 'IA en ligne', expected: true, got: r.state.players[bot.me].online },
  ]);
  assert.equal(kept, played, 'aucun ordre perdu au rechargement');
  r.end();
});

// Issue #39 (D-370) : avec 7 IA, la fiche d'une IA n'est plus recopiée en entier, journal compris,
// pour chaque Session du téléphone. Même graine : la même partie, au caractère près, que l'ancienne
// copie complète en JSON ; et beaucoup moins de JSON écrit pendant la livraison des messages.
scenario('D-370 : 7 IA, même graine : même partie qu’avec la copie complète, cinq fois moins de JSON', async (film) => {
  const { measure } = await import('./perf-ia.mjs');
  const { LINK } = await import('../js/bot.js');
  LINK.fullCopy = true;
  const full = await measure({ bots: 7, minutes: 22, seed: 3 }).finally(() => (LINK.fullCopy = false));
  const fast = await measure({ bots: 7, minutes: 22, seed: 3 });
  const late = (rows) => rows.filter((r) => r.minute >= 17).reduce((t, r) => t + r.koParS, 0) / 5;
  const [kFull, kFast] = [late(full.rows), late(fast.rows)];
  film.look(fast.host, `22 min, même graine : copie complète puis copie D-370 ; JSON pendant la livraison (min 17-22) ${kFull.toFixed(0)} puis ${kFast.toFixed(0)} Ko/s`, [
    { show: 'fiches chez l’hôte (empreinte)', expected: full.result.hote, got: fast.result.hote },
    { show: 'fiches chez chaque IA (empreintes)', expected: full.result.ias.join(' '), got: fast.result.ias.join(' ') },
    { show: 'classement', expected: full.result.classement.join(' '), got: fast.result.classement.join(' ') },
    { show: 'rejeu (empreinte)', expected: full.result.rejeu, got: fast.result.rejeu },
    { show: 'JSON < 100 Ko/s', expected: true, got: kFast < 100 },
    { show: 'au moins 5 fois moins de JSON', expected: true, got: kFast * 5 <= kFull },
  ]);
  assert.deepEqual(fast.result, full.result);
  assert.ok(!full.result.rejeu.startsWith('erreur'), full.result.rejeu);
  assert.ok(kFast < 100 && kFast * 5 <= kFull, `${kFast} Ko/s contre ${kFull}`);
});
