// Deux joueurs colonisent la même planète sans se voir (partie coupée en
// deux). Au recollage, le perdant retrouve son escorte et sa cargaison en
// orbite, au lieu de tout perdre avec la colonie.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

scenario('colonie perdue au recollage : les vaisseaux et la cargaison restent en orbite', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const target = A.planets[5];
  const cell = { x: target.x, y: target.y };
  for (const [s, late] of [[A, 30_000], [B, 0]]) {
    const pl = s.state.players[s.me].planet;
    Object.assign(pl, { ships: { colony: 1, fighter: 5, cargo: 2 }, stock: { ...pl.stock, minerals: 900, energy: 900 } });
    const id = s.takeOff('home', { colony: 1, fighter: 5, cargo: 2 }, { minerals: 800 }, 300);
    Object.assign(s.myFleet(id), { from: { ...cell }, to: { ...cell } });
    s.moveFleet(id, cell, 'colonize');
    const f = s.myFleet(id);
    f.arrive += late; // A arrive 30 s après B
    f.depart += late;
  }
  film.look(A, 'A et B envoient chacun un colon vers la même planète (A arrivera 30 s après B)');
  clock.t += 31_000;
  A.tick();
  B.tick();
  film.look(A, 'après 31 s, sans se voir : A a fondé sa colonie', [{ show: 'colonie de A', at: cell, expected: true, got: !!A.state.players[A.me].colonies[target.id] }]);
  assert.ok(A.state.players[A.me].colonies[target.id], 'A a fondé sa colonie sans voir celle de B');

  sync(A, B);
  film.look(A, 'recollage : A reçoit la fiche de B, arrivé le premier');
  clock.t += 250;
  A.tick();
  const pa = A.state.players[A.me];
  const back = pa.fleets.find((f) => f.to.x === cell.x && f.to.y === cell.y);
  film.look(A, 'A perd la colonie : sa flotte attend en orbite, avec ses vaisseaux et sa cargaison', [
    { show: 'colonie de A', at: cell, expected: false, got: !!pa.colonies[target.id] },
    { show: 'flotte en orbite', at: [A, back?.id], expected: { colony: 1, fighter: 5, cargo: 2 }, got: back?.ships },
    { show: 'minéraux en soute', at: [A, back?.id], expected: 'entre 800 et 810', got: back?.cargo.minerals, ok: back?.cargo.minerals >= 800 && back?.cargo.minerals < 810 },
  ]);
  assert.equal(pa.colonies[target.id], undefined, 'B, arrivé le premier, garde la planète');
  assert.ok(back, 'une flotte de A attend en orbite');
  assert.deepEqual(back.ships, { colony: 1, fighter: 5, cargo: 2 });
  // La cargaison revient, plus ce que la colonie a produit pendant sa courte vie.
  assert.ok(back.cargo.minerals >= 800 && back.cargo.minerals < 810, `cargaison ${back.cargo.minerals}`);
});
