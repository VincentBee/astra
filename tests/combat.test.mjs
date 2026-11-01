// Combat contre une planète : l'attaquant ne doit pas piller le même stock
// ni tuer les mêmes vaisseaux deux fois tant que le défenseur n'a pas lu ses
// rapports (défenseur hors ligne, ou plusieurs flottes arrivées ensemble).
// Lancer : node --test
import assert from 'node:assert/strict';
import { newGame, game, fleet, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

const countShips = (ships) => Object.values(ships).reduce((t, n) => t + n, 0);

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
  return { A, B, clock, cell, fleet, outcome };
}

scenario('attaques répétées sur un défenseur hors ligne : pas de butin créé', (film) => {
  const { A, B, clock, cell, fleet, outcome } = raid();
  const id = fleet();
  film.look(A, 'une flotte de A (20 chasseurs, 20 cargos) en orbite sur la planète de B');
  for (let i = 0; i < 5; i++) {
    clock.t += 1000;
    A.moveFleet(id, cell, 'attack');
    A.tick();
    film.look(A, `attaque ${i + 1} sur 5, B hors ligne`);
  }
  const r = outcome([id]);
  film.look(B, 'B revient et lit les rapports de combat');
  assert.equal(r.killed, 4, 'B n’avait que 4 drones');
  assert.ok(r.looted + r.left <= r.real + 1, `pillé ${r.looted} + restant ${r.left} > stock réel ${r.real}`);
});

scenario('plusieurs flottes arrivées au même instant : pas de butin créé', (film) => {
  const { A, B, clock, cell, fleet, outcome } = raid();
  const ids = [fleet(), fleet(), fleet()];
  film.look(A, 'trois flottes de A en orbite sur la planète de B');
  clock.t += 1000;
  for (const id of ids) A.moveFleet(id, cell, 'attack');
  A.tick();
  film.look(A, 'les trois flottes attaquent au même instant');
  const r = outcome(ids);
  film.look(B, 'B revient et lit les rapports de combat');
  assert.equal(r.killed, 4, 'B n’avait que 4 drones');
  assert.ok(r.looted + r.left <= r.real + 1, `pillé ${r.looted} + restant ${r.left} > stock réel ${r.real}`);
});

scenario('70 attaques avant le retour du défenseur : chaque pillage est subi', (film) => {
  const { A, B, clock, cell, fleet, outcome } = raid();
  const id = fleet();
  film.look(A, 'une flotte de A en orbite sur la planète de B');
  for (let i = 0; i < 70; i++) {
    clock.t += 1000;
    A.moveFleet(id, cell, 'attack');
    A.tick();
    if (i % 10 === 9) film.look(A, `après ${i + 1} attaques, B hors ligne`);
  }
  const r = outcome([id]);
  film.look(B, 'B revient et lit les rapports de combat');
  assert.equal(r.killed, 4, 'le rapport du premier combat est encore là');
  assert.ok(Math.abs(r.looted + r.left - r.real) <= 1, `pillé ${r.looted} + restant ${r.left} ≠ stock réel ${r.real}`);
});

scenario('les vaisseaux perdus emportent la cargaison qu’ils portaient', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'machine']);
  B.state.players[B.me].planet.ships = { fighter: 18 };
  B.touch();
  sync(A, B);
  const ap = A.state.players[A.me].planet;
  Object.assign(ap, { ships: { cargo: 5, heavy: 3 }, stock: { ...ap.stock, minerals: 3000 } });
  ap.levels.store = 3;
  const id = A.takeOff('home', { cargo: 5, heavy: 3 }, { minerals: 2950 }, 0);
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 400 });
  film.look(A, 'A (5 cargos, 3 lourds, 2950 minéraux en soute) en orbite chez B (18 drones)');
  A.moveFleet(id, cell, 'attack');
  A.tick();
  film.look(A, 'après le combat : A a perdu des vaisseaux');
  const f = A.myFleet(id);
  const carried = Object.values(f.cargo).reduce((t, v) => t + v, 0);
  assert.ok(countShips(f.ships) < 8, 'la flotte a perdu des vaisseaux');
  assert.ok(carried <= fleet.fleetCargo('human', f.ships), `cargaison ${carried} > soute ${fleet.fleetCargo('human', f.ships)}`);
});
