// Carnet de combats (D-110) : chaque joueur garde, sur son téléphone, ses
// combats vus de son côté (pertes des deux côtés, butin, planète prise), même
// quand ils sont calculés pendant son absence.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

/** A (humain) en orbite sur la planète de B (machine, 4 drones, 4000 minéraux), qui attaque. */
function raid(kind = 'attack', film) {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  bp.levels.store = 3;
  bp.reserve.minerals = bp.nature.minerals.max;
  B.touch();
  sync(A, B);
  const ap = P(A).planet;
  ap.tech = { propulsion: 1, blindage: 1 };
  ap.ships = { fighter: 20, cargo: 20 };
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  const id = A.takeOff('home', { fighter: 20, cargo: 20 }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  film?.look(A, `la flotte de A en orbite de la planète de B (ordre : ${kind})`);
  A.moveFleet(id, cell, kind);
  A.tick();
  return { A, B, clock, sync };
}

scenario('attaque de planète : les deux carnets ont les pertes des deux côtés et le butin', (film) => {
  const { A, B, sync } = raid('attack', film);
  const a = A.journal.list.find((e) => e.kind === 'combat');
  film.look(A, 'combat : A a abattu les drones et pillé ; son carnet le note', [
    { show: 'carnet de A', expected: 'good', got: a?.tone },
    { show: 'drones de B abattus', expected: 4, got: a?.theirs },
    { show: 'butin', expected: 'des minéraux', got: a?.loot, ok: !!a?.loot.includes('minéraux') },
  ]);
  assert.equal(a.tone, 'good');
  assert.equal(a.theirs, 4, 'les 4 drones de B');
  assert.ok(a.loot.includes('minéraux'), a.loot);
  sync(B, A); // B revient et lit le rapport de A
  B.tick();
  const b = B.journal.list.find((e) => e.kind === 'combat');
  film.look(B, 'B revient et lit le rapport de A : son carnet a le même combat, de son côté', [
    { show: 'carnet de B', expected: 'bad', got: b?.tone },
    { show: 'drones perdus par B', expected: 4, got: b?.mine },
    { show: 'pertes de A, connues de B', expected: a.mine, got: b?.theirs },
    { show: 'pillé chez B', expected: a.loot, got: b?.pillaged },
    { show: 'daté du combat', expected: true, got: b?.at === a.at },
  ]);
  assert.equal(b.tone, 'bad');
  assert.equal(b.mine, 4);
  assert.equal(b.theirs, a.mine, 'B connaît les pertes de A');
  assert.equal(b.pillaged, a.loot, 'B sait ce qu’on lui a pillé');
  assert.equal(b.at, a.at, 'daté du combat, pas de la lecture');
  assert.ok(B.journal.n > B.journal.read, 'neuf pour B (résumé « pendant ton absence »)');
  B.markRead();
  assert.equal(B.journal.read, B.journal.n);
});

scenario('planète prise : le carnet du perdant dit qui l’a prise et qu’il est éliminé', (film) => {
  const { B, sync, A } = raid('conquer', film);
  film.look(A, 'combat : A a pris la planète de B', [{ show: 'prise, dans le carnet de A', expected: true, got: A.journal.list.some((e) => e.capture && e.tone === 'good') }]);
  assert.ok(A.journal.list.some((e) => e.capture && e.tone === 'good'));
  sync(B, A);
  B.tick();
  const texts = B.journal.list.map((e) => e.text);
  film.look(B, 'B lit le rapport : planète perdue, il est éliminé', [
    { show: 'perte, dans le carnet de B', expected: true, got: B.journal.list.some((e) => e.capture && e.tone === 'bad') },
    { show: 'le carnet dit « tu es éliminé »', expected: true, got: texts.some((t) => t.includes('tu es éliminé')) },
  ]);
  assert.ok(B.journal.list.some((e) => e.capture && e.tone === 'bad'), texts.join(' | '));
  assert.ok(texts.some((t) => t.includes('tu es éliminé')), texts.join(' | '));
});

scenario('le carnet reste sur le téléphone : il ne part pas avec la fiche', (film) => {
  const { A } = raid('attack', film);
  film.look(A, 'après le combat : le carnet est rempli, mais pas dans la fiche envoyée aux autres', [
    { show: 'entrées du carnet', expected: 'au moins 1', got: A.journal.list.length, ok: A.journal.list.length > 0 },
    { show: 'carnet dans la fiche envoyée', expected: false, got: JSON.stringify(A.snapshot()).includes('"journal"') },
  ]);
  assert.ok(A.journal.list.length > 0);
  assert.ok(!JSON.stringify(A.snapshot()).includes('"journal"'));
});
