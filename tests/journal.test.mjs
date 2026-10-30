// Carnet de combats (D-110) : chaque joueur garde, sur son téléphone, ses
// combats vus de son côté (pertes des deux côtés, butin, planète prise), même
// quand ils sont calculés pendant son absence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';

const P = (s) => s.state.players[s.me];

/** A (humain) en orbite sur la planète de B (machine, 4 drones, 4000 minéraux), qui attaque. */
function raid(kind = 'attack') {
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
  A.moveFleet(id, cell, kind);
  A.tick();
  return { A, B, clock, sync };
}

test('attaque de planète : les deux carnets ont les pertes des deux côtés et le butin', () => {
  const { A, B, sync } = raid();
  const a = A.journal.list.find((e) => e.kind === 'combat');
  assert.equal(a.tone, 'good');
  assert.equal(a.theirs, 4, 'les 4 drones de B');
  assert.ok(a.loot.includes('minéraux'), a.loot);
  sync(B, A); // B revient et lit le rapport de A
  B.tick();
  const b = B.journal.list.find((e) => e.kind === 'combat');
  assert.equal(b.tone, 'bad');
  assert.equal(b.mine, 4);
  assert.equal(b.theirs, a.mine, 'B connaît les pertes de A');
  assert.equal(b.pillaged, a.loot, 'B sait ce qu’on lui a pillé');
  assert.equal(b.at, a.at, 'daté du combat, pas de la lecture');
  assert.ok(B.journal.n > B.journal.read, 'neuf pour B (résumé « pendant ton absence »)');
  B.markRead();
  assert.equal(B.journal.read, B.journal.n);
});

test('planète prise : le carnet du perdant dit qui l’a prise et qu’il est éliminé', () => {
  const { B, sync, A } = raid('conquer');
  assert.ok(A.journal.list.some((e) => e.capture && e.tone === 'good'));
  sync(B, A);
  B.tick();
  const texts = B.journal.list.map((e) => e.text);
  assert.ok(B.journal.list.some((e) => e.capture && e.tone === 'bad'), texts.join(' | '));
  assert.ok(texts.some((t) => t.includes('tu es éliminé')), texts.join(' | '));
});

test('le carnet reste sur le téléphone : il ne part pas avec la fiche', () => {
  const { A } = raid();
  assert.ok(A.journal.list.length > 0);
  assert.ok(!JSON.stringify(A.snapshot()).includes('"journal"'));
});
