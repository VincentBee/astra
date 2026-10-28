// Règles d'une planète : l'heure, les longues absences, les pouvoirs et les
// entrées abîmées ne doivent ni créer ni faire perdre de ressources.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game, fleet, clone } from './harness.mjs';

const T0 = 10_000_000;
const MIN = 60_000;
const HOUR = 3_600_000;

/** Une planète de la race donnée, avec 4 mines et 1 centrale. */
function planet(race) {
  const p = game.newPlanet(race, T0, game.planetsFor('gtest')[0]);
  p.levels = { ...p.levels, mine: 4, solar: 1, reactor: 1 };
  p.stock.minerals = 300;
  return p;
}

test('une heure qui recule puis revient ne recompte pas la production', () => {
  const a = planet('human');
  const b = clone(a);
  game.settle(a, T0 + 10 * MIN);
  game.settle(b, T0 + 10 * MIN);
  game.settle(b, T0 + 8 * MIN); // l'horloge du téléphone recule de 2 min…
  game.settle(b, T0 + 10 * MIN); // … puis revient
  assert.equal(b.stock.minerals, a.stock.minerals);
  assert.equal(game.settle(b, NaN).length, 0);
  assert.equal(b.at, T0 + 10 * MIN);
});

test('une longue absence donne la même planète que des passages toutes les heures', () => {
  // Planète de départ avec 4 mines : pénurie d'énergie, la population baisse.
  const once = game.newPlanet('human', T0, game.planetsFor('gtest')[0]);
  once.levels = { ...once.levels, mine: 4 };
  const hourly = clone(once);
  game.settle(once, T0 + 24 * HOUR);
  for (let h = 1; h <= 24; h++) game.settle(hourly, T0 + h * HOUR);
  const gap = Math.abs(once.pop - hourly.pop) / hourly.pop;
  assert.ok(gap < 0.02, `population ${once.pop} contre ${hourly.pop}`);
});

test('l’arrachement est refusé, sans rien payer, quand il ne rapporterait rien', () => {
  const p = planet('alien');
  game.settle(p, T0);
  p.stock = { ...p.stock, minerals: game.storageCap(p.levels.store || 0), energy: 500 };
  const before = clone(p);
  const res = game.usePower(p, 'lift', T0);
  assert.ok(res.error, 'refusé');
  assert.equal(p.stock.energy, before.stock.energy, 'énergie non payée');
  assert.deepEqual(p.powers || {}, before.powers || {}, 'pas de recharge lancée');
});

test('des clés héritées (constructor, __proto__…) sont refusées sans planter', () => {
  const p = planet('human');
  for (const key of ['constructor', 'toString', '__proto__']) {
    assert.equal(typeof game.startBuild(p, key, T0), 'string');
    assert.equal(typeof game.startResearch(p, key, T0), 'string');
    assert.equal(typeof game.startShips(p, key, 1, T0), 'string');
    assert.ok(game.usePower({ ...planet('alien') }, key, T0).error);
  }
});

test('un effectif négatif ou fractionnaire ne crée pas de vaisseaux au combat', () => {
  const res = fleet.battle({ race: 'human', ships: { fighter: -5, heavy: 1 } }, { race: 'machine', ships: { fighter: 2.5 } });
  for (const side of [res.attLeft, res.defLeft]) for (const n of Object.values(side)) assert.ok(Number.isInteger(n) && n >= 0);
  assert.ok((res.attLeft.heavy || 0) <= 1, 'pas plus de croiseurs qu’au départ');
  assert.ok((res.defLeft.fighter || 0) <= 2, 'pas plus de drones qu’au départ');
});
