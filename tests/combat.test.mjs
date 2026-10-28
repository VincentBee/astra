// Combat contre une planète : l'attaquant ne doit pas piller le même stock
// ni tuer les mêmes vaisseaux deux fois tant que le défenseur n'a pas lu ses
// rapports (défenseur hors ligne, ou plusieurs flottes arrivées ensemble).
// Lancer : node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';

/** A (humain) attaque B (machine), qui a 4000 minéraux et 4 drones à quai. */
function raid() {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = B.state.players[B.me].planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  bp.levels.store = 3;
  bp.reserve.minerals = bp.nature.minerals.max;
  B.touch();
  sync(A, B); // A reçoit la fiche de B une seule fois
  const before = clone(bp);
  const ap = A.state.players[A.me].planet;
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
    sync(B, A);
    B.tick();
    const looted = ids.reduce((t, id) => t + (A.myFleet(id)?.cargo?.minerals || 0), 0);
    const killed = A.state.players[A.me].effects.reduce((t, e) => t + (e.ships.fighter || 0), 0);
    return {
      real: game.stateAt(before, clock.t).stock.minerals,
      left: game.stateAt(B.state.players[B.me].planet, clock.t).stock.minerals,
      looted,
      killed,
    };
  };
  return { A, clock, cell, fleet, outcome };
}

test('attaques répétées sur un défenseur hors ligne : pas de butin créé', () => {
  const { A, clock, cell, fleet, outcome } = raid();
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
  const { A, clock, cell, fleet, outcome } = raid();
  const ids = [fleet(), fleet(), fleet()];
  clock.t += 1000;
  for (const id of ids) A.moveFleet(id, cell, 'attack');
  A.tick();
  const r = outcome(ids);
  assert.equal(r.killed, 4, 'B n’avait que 4 drones');
  assert.ok(r.looted + r.left <= r.real + 1, `pillé ${r.looted} + restant ${r.left} > stock réel ${r.real}`);
});

test('70 attaques avant le retour du défenseur : chaque pillage est subi', () => {
  const { A, clock, cell, fleet, outcome } = raid();
  const id = fleet();
  for (let i = 0; i < 70; i++) {
    clock.t += 1000;
    A.moveFleet(id, cell, 'attack');
    A.tick();
  }
  const r = outcome([id]);
  assert.equal(r.killed, 4, 'le rapport du premier combat est encore là');
  assert.ok(Math.abs(r.looted + r.left - r.real) <= 1, `pillé ${r.looted} + restant ${r.left} ≠ stock réel ${r.real}`);
});
