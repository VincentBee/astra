// Rejeu : une partie jouée seulement par des ordres (comme depuis l'appli)
// doit se refaire à l'identique à partir des journaux des fiches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';

const { replay, replayable, playersAt, comparable } = await import('../js/replay.js');
const { TECHS, SHIPS } = await import('../js/tech.js');

const MIN = 60_000;
const keys = (o) => Object.keys(o);

/**
 * Un petit robot par joueur : à chaque tour, il essaie de construire,
 * chercher, armer des vaisseaux, faire décoller une flotte et l'envoyer
 * chez un autre joueur. Les ordres refusés ne changent rien (ni journal).
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
      for (const f of p.fleets || []) {
        if (f.order) continue;
        act(s, () => (turn % 3 === 2 ? s.returnFleet(f.id) : s.moveFleet(f.id, enemy.home, 'attack')));
      }
    }
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
  for (const k of ['chooseRace', 'claimPlanet', 'build', 'research', 'buildShips', 'takeOff', 'moveFleet', 'tick']) assert.ok(kinds.has(k), `la partie contient des « ${k} »`);
  assert.ok(state.players.p0.orders.some((o) => o.ids?.length), 'des identifiants tirés sont notés');

  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  for (const p of Object.values(state.players)) {
    assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
    assert.equal(r.faithful[p.id], true);
  }
  assert.ok(r.log.length > 40, 'le journal rejoué garde tout');
  const last = playersAt(r.frames, r.frames.length - 1);
  assert.equal(Object.keys(last).length, 3);
});

test('un journal tronqué est signalé', () => {
  const { players } = newGame(2);
  const state = clone(players[0].snapshot());
  state.players.p1.orders.shift();
  assert.deepEqual(replayable(state), { ok: false, missing: ['J1'] });
});
