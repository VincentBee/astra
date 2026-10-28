// Combat contre une planète : l'attaquant ne doit pas piller le même stock
// ni tuer les mêmes vaisseaux deux fois tant que le défenseur n'a pas lu ses
// rapports (défenseur hors ligne, ou plusieurs flottes arrivées ensemble).
// Lancer : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Session tourne dans le navigateur : on remplace ce qu'elle y lit.
const store = new Map();
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.document = { addEventListener() {}, removeEventListener() {}, visibilityState: 'visible' };
globalThis.window = globalThis;

const { Session } = await import('../js/session.js');
const { stateAt } = await import('../js/game.js');

/** Deux joueurs sans réseau ni minuteurs, sur une horloge commune. B a 4000 minéraux et 4 drones à quai. */
function game() {
  const clock = { t: 10_000_000 };
  const make = (name, pid) => {
    const s = new Session(name);
    Object.assign(s, { now: () => clock.t, start() {}, meet() {}, me: pid, status: 'playing' });
    s.state = { gid: 'gtest', key: 'k', players: {}, log: [] };
    s.addPlayer(pid, name, 'x'.repeat(64));
    return s;
  };
  const A = make('A', 'pa');
  const B = make('B', 'pb');
  A.chooseRace('human');
  B.chooseRace('machine');
  A.claimPlanet(A.planets[0].id);
  B.claimPlanet(A.planets[1].id);
  const bp = B.state.players.pb.planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  bp.levels.store = 3;
  bp.reserve.minerals = bp.nature.minerals.max;
  B.touch();
  A.mergeIn(B.snapshot(), { pid: 'pb' }); // A reçoit la fiche de B une seule fois
  const before = JSON.parse(JSON.stringify(bp));
  const ap = A.state.players.pa.planet;
  ap.tech = { propulsion: 1, blindage: 1 };
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  /** Une flotte de A déjà en orbite sur la planète de B. */
  const fleet = () => {
    ap.ships = { fighter: 20, cargo: 20 };
    const id = A.takeOff('home', { fighter: 20, cargo: 20 }, {}, 0);
    Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
    return id;
  };
  /** Ce que B aurait eu sans attaque, ce qu'il garde après lecture des rapports, et le bilan de A. */
  const outcome = (ids) => {
    B.mergeIn(A.snapshot(), { pid: 'pa' });
    B.tick();
    const looted = ids.reduce((t, id) => t + (A.myFleet(id)?.cargo?.minerals || 0), 0);
    const killed = A.state.players.pa.effects.reduce((t, e) => t + (e.ships.fighter || 0), 0);
    return {
      real: stateAt(before, clock.t).stock.minerals,
      left: stateAt(B.state.players.pb.planet, clock.t).stock.minerals,
      looted,
      killed,
    };
  };
  return { A, clock, cell, fleet, outcome };
}

test('attaques répétées sur un défenseur hors ligne : pas de butin créé', () => {
  const { A, clock, cell, fleet, outcome } = game();
  const id = fleet();
  for (let i = 0; i < 5; i++) {
    clock.t += 1000;
    A.moveFleet(id, cell, 'attack');
    A.tick();
  }
  const r = outcome([id]);
  assert.equal(r.killed, 4, 'B n’avait que 4 drones');
  assert.ok(r.looted + r.left <= r.real + 1, `pillé ${r.looted} + restant ${r.left} > stock réel ${r.real}`);
});

test('plusieurs flottes arrivées au même instant : pas de butin créé', () => {
  const { A, clock, cell, fleet, outcome } = game();
  const ids = [fleet(), fleet(), fleet()];
  clock.t += 1000;
  for (const id of ids) A.moveFleet(id, cell, 'attack');
  A.tick();
  const r = outcome(ids);
  assert.equal(r.killed, 4, 'B n’avait que 4 drones');
  assert.ok(r.looted + r.left <= r.real + 1, `pillé ${r.looted} + restant ${r.left} > stock réel ${r.real}`);
});
