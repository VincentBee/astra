// Rejeu : une partie jouée seulement par des ordres (comme depuis l'appli)
// doit se refaire à l'identique à partir des journaux des fiches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';

const { replay, replayable, playersAt, comparable, scoreSeries } = await import('../js/replay.js');
const { TECHS, SHIPS } = await import('../js/tech.js');

const MIN = 60_000;
const keys = (o) => Object.keys(o);

/**
 * Un petit robot par joueur : à chaque tour, il essaie de construire,
 * chercher, armer des vaisseaux, faire décoller une flotte et l'envoyer
 * chez un autre joueur. Les ordres refusés ne changent pas la partie, mais
 * sont notés au journal (D-045).
 */
function play(players, clock, sync, turns) {
  const share = (s) => {
    for (const o of players) if (o !== s) sync(o, s);
  };
  const act = (s, fn) => {
    fn();
    share(s);
  };
  for (let turn = 0; turn < turns; turn++) {
    for (const [i, s] of players.entries()) {
      const p = s.state.players[s.me];
      const race = p.race;
      const pl = p.planet;
      const order = keys(game.RACES[race].buildings);
      act(s, () => s.build(order[(turn + i) % order.length]));
      act(s, () => s.research(keys(TECHS[race])[(turn + i) % keys(TECHS[race]).length]));
      for (const type of keys(SHIPS[race])) if (type !== 'colony') act(s, () => s.buildShips(type, 2));
      const docked = Object.fromEntries(Object.entries(pl.ships || {}).filter(([k, n]) => n > 0 && k !== 'colony'));
      if (Object.keys(docked).length && !(p.fleets || []).length) act(s, () => s.takeOff('home', docked, {}, Math.floor(pl.stock.energy / 2)));
      const enemy = players[(i + 1) % players.length].state.players[players[(i + 1) % players.length].me];
      // Échanges : une flotte arrêtée chez un autre lui donne un peu de carburant.
      for (const f of p.fleets || []) {
        const partner = !f.order && s.tradePartners({ fleet: f.id })[0];
        if (partner) act(s, () => s.proposeTrade({ fleet: f.id }, { pid: partner.pid, ...partner.ref }, { fuel: 1 }, {}));
      }
      for (const f of p.fleets || []) {
        if (!s.locked(f.id)) act(s, () => s.setFleetStance(f.id, turn % 4 < 2 ? 'aggressive' : 'passive'));
        if (f.order || s.locked(f.id)) continue;
        // Une flotte sans armes ne peut pas attaquer : elle y va simplement (et peut y échanger).
        act(s, () => (turn % 3 === 2 ? s.returnFleet(f.id) : s.moveFleet(f.id, enemy.home, 'attack') || s.moveFleet(f.id, enemy.home, 'move')));
      }
    }
    // L'autre accepte ou refuse avant que l'offre n'expire.
    for (const s of players) for (const { from, offer } of s.incomingOffers()) act(s, () => s.answerTrade(from.id, offer.id, turn % 2 === 0));
    clock.t += 7 * MIN;
    for (const s of players) {
      s.tick();
      share(s);
    }
  }
}

test('une partie rejouée depuis les journaux retombe sur les mêmes fiches', () => {
  const { players, clock, sync } = newGame(3);
  play(players, clock, sync, 60);
  const state = clone(players[0].snapshot());
  for (const s of players) sync(players[0], s);

  const kinds = new Set(Object.values(state.players).flatMap((p) => p.orders.map((o) => o.k)));
  for (const k of ['chooseRace', 'claimPlanet', 'build', 'research', 'buildShips', 'takeOff', 'moveFleet', 'setFleetStance', 'proposeTrade', 'answerTrade', 'tick']) assert.ok(kinds.has(k), `la partie contient des « ${k} »`);
  assert.ok(Object.values(state.players).some((p) => p.orders.some((o) => o.ids?.length)), 'des identifiants tirés sont notés');

  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  for (const p of Object.values(state.players)) {
    assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
    assert.equal(r.faithful[p.id], true);
  }
  assert.ok(r.log.length > 40, 'le journal rejoué garde tout');
  for (const word of ['accepte', 'refuse', 'Échange conclu']) assert.ok(r.log.some((l) => l.text.includes(word)), `des échanges : « ${word} »`);
  const last = playersAt(r.frames, r.frames.length - 1);
  assert.equal(Object.keys(last).length, 3);
});

test('partie coupée en deux puis recollée : chacun est rejoué avec ce qu’il savait', () => {
  const { players, clock, sync } = newGame(3);
  play(players, clock, sync, 15);
  // J0 joue seul de son côté pendant que J1 et J2 continuent ensemble, puis tout se recolle.
  const [a, ...rest] = players;
  play([a], clock, () => {}, 12);
  clock.t -= 12 * 7 * MIN;
  play(rest, clock, sync, 12);
  for (const x of players) for (const y of players) if (x !== y) sync(x, y);
  play(players, clock, sync, 10);
  for (const s of players) sync(players[0], s);
  const state = clone(players[0].snapshot());
  const r = replay(state);
  for (const p of Object.values(state.players)) assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
});

test('un journal tronqué est signalé', () => {
  const { players } = newGame(2);
  const state = clone(players[0].snapshot());
  state.players.p1.orders.shift();
  assert.deepEqual(replayable(state), { ok: false, missing: ['J1'], stale: false });
});

test('une copie pas encore à jour est signalée au lieu de faire planter le rejeu', () => {
  const { players } = newGame(2);
  const state = clone(players[0].snapshot());
  // p0 dit connaître une entrée du journal de p1 que cette copie n'a pas encore reçue.
  state.players.p0.orders.at(-1).s = { p1: state.players.p1.orders.length + 1 };
  assert.equal(replayable(state).stale, true);
  assert.equal(replayable(state).ok, false);
});

test('courbe des points : elle suit le score de chaque joueur', () => {
  const { players, clock, sync } = newGame(2);
  play(players, clock, sync, 20);
  const state = clone(players[0].snapshot());
  const series = scoreSeries(replay(state).frames, state.gid);
  for (const s of players) assert.equal(series[s.me].at(-1).pts, s.scoreOf(s.state.players[s.me]), `points de ${s.name}`);
  assert.ok(series.p0.length > 3, 'la courbe a plusieurs marches');
});

test('courbe des points : elle retombe à 0 quand le joueur a tout perdu, et le rejeu refait deathPts', () => {
  // Le froid joue dès le début (le rejeu le recalcule avec le même réglage).
  Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * MIN });
  try {
    const { players: [A], clock } = newGame(1, ['human']);
    A.build('mine');
    clock.t += 2 * MIN;
    A.tick();
    const rich = A.scoreOf(A.state.players[A.me]);
    assert.ok(rich > 0);
    clock.t += 30 * MIN;
    A.tick();
    const p = A.state.players[A.me];
    assert.ok(Number.isFinite(p.out), 'éliminé');
    assert.equal(A.scoreOf(p), 0, 'plus rien : 0 point');
    assert.equal(p.deathPts, rich, 'les points d’avant la chute sont gardés');
    const state = clone(A.snapshot());
    const r = replay(state);
    const line = scoreSeries(r.frames, state.gid)[A.me];
    assert.equal(line.at(-1).pts, 0);
    assert.equal(Math.max(...line.map((x) => x.pts)), rich);
    assert.equal(r.faithful[A.me], true);
  } finally {
    game.FROST.delayMs = Infinity;
    game.FROST.durationMs = 24 * MIN;
  }
});
