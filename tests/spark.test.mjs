// Mini-graphes des tuiles (#71) : un historique par planète.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyHistory, ownHistory, addSample, sparkPath, SAMPLE_MS, HISTORY_MS } from '../js/spark.js';

const fill = (h, key, t0, n, f) => {
  for (let i = 0; i < n; i++) addSample(h, key, t0 + i * SAMPLE_MS, { metal: f(i) });
};

test('mère, puis colonie, puis mère : chaque planète garde sa propre courbe', () => {
  const h = emptyHistory('g|me');
  fill(h, 'home', 0, 5, (i) => 100 + i * 10); // la mère monte
  const homeBefore = sparkPath(h, 'home', 'metal');
  assert.ok(homeBefore, 'la mère a une courbe');

  // On ouvre la colonie : 1 seul relevé → pas de courbe, et surtout pas celle de la mère.
  addSample(h, 'p0', 5 * SAMPLE_MS, { metal: 50 });
  assert.equal(sparkPath(h, 'p0', 'metal'), null);

  // Quelques relevés sur la colonie, qui descend.
  fill(h, 'p0', 6 * SAMPLE_MS, 3, (i) => 50 - i * 5);
  const colony = sparkPath(h, 'p0', 'metal');
  assert.ok(colony);
  assert.notEqual(colony.line, homeBefore.line);

  // Retour à la mère : ses 5 relevés sont toujours là, plus le nouveau.
  addSample(h, 'home', 9 * SAMPLE_MS, { metal: 150 });
  assert.equal(h.p.home.t.length, 6);
  assert.deepEqual(h.p.home.v.metal, [100, 110, 120, 130, 140, 150]);
  assert.equal(h.p.p0.t.length, 4);
});

test('nouvelle planète, moins de 2 relevés : pas de courbe', () => {
  const h = emptyHistory('g|me');
  assert.equal(sparkPath(h, 'p1', 'metal'), null);
  addSample(h, 'p1', 0, { metal: 3 });
  assert.equal(sparkPath(h, 'p1', 'metal'), null);
  addSample(h, 'p1', SAMPLE_MS, { metal: 4 });
  assert.match(sparkPath(h, 'p1', 'metal').line, /^M0\.0,28\.0L100\.0,2\.0$/);
});

test('au plus un relevé toutes les 5 s, par planète', () => {
  const h = emptyHistory('g|me');
  assert.equal(addSample(h, 'home', 0, { metal: 1 }), true);
  assert.equal(addSample(h, 'home', SAMPLE_MS - 1, { metal: 2 }), false);
  assert.equal(addSample(h, 'p0', SAMPLE_MS - 1, { metal: 2 }), true); // autre planète : son propre rythme
});

test('chaque planète oublie ce qui a plus de 10 minutes', () => {
  const h = emptyHistory('g|me');
  fill(h, 'home', 0, 3, (i) => i);
  addSample(h, 'home', HISTORY_MS + SAMPLE_MS + 1, { metal: 9 });
  assert.deepEqual(h.p.home.t, [2 * SAMPLE_MS, HISTORY_MS + SAMPLE_MS + 1]);
  assert.deepEqual(h.p.home.v.metal, [2, 9]);
});

test("ancien format (un seul historique) ou autre partie : on repart d'un historique vide", () => {
  assert.deepEqual(ownHistory({ id: 'g|me|home', t: [1], v: { metal: [1] } }, 'g|me'), { id: 'g|me', p: {} });
  assert.deepEqual(ownHistory({ id: 'g2|me', p: { home: { t: [], v: {} } } }, 'g|me'), { id: 'g|me', p: {} });
  const ok = { id: 'g|me', p: { home: { t: [1], v: { metal: [1] } } } };
  assert.equal(ownHistory(ok, 'g|me'), ok);
  assert.deepEqual(ownHistory(null, 'g|me'), { id: 'g|me', p: {} });
});
