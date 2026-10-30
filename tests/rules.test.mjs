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

test('le soleil est au milieu de la carte, de 2 × 2 à 4 × 4, et aucune planète n’y est', () => {
  const sizes = new Set();
  for (let i = 0; i < 300; i++) {
    const gid = `g${i}`;
    const sun = game.sunFor(gid);
    sizes.add(sun.size);
    assert.ok(sun.size >= 2 && sun.size <= 4);
    assert.deepEqual(game.sunFor(gid), sun, 'le même sur tous les téléphones');
    const mid = sun.x + sun.size / 2;
    assert.ok(Math.abs(mid - game.UNIVERSE.w / 2) <= 0.5 && Math.abs(sun.y + sun.size / 2 - game.UNIVERSE.h / 2) <= 0.5);
    const planets = game.planetsFor(gid);
    assert.equal(planets.filter((w) => w.kind === 'planet').length, game.PLANET_COUNT);
    assert.equal(planets.length, game.PLANET_COUNT + Object.values(game.SMALL_BODIES).reduce((t, b) => t + b.count, 0));
    assert.ok(planets.every((w) => !game.inSun(sun, w)), `planète dans le soleil (${gid})`);
    assert.equal(new Set(planets.map((w) => `${w.x}:${w.y}`)).size, planets.length, 'deux planètes sur la même case');
  }
  assert.deepEqual([...sizes].sort(), [2, 3, 4]);
});

test('plus une planète est près du soleil, plus elle est chaude, et son climat change la production', () => {
  const sun = { x: 9, y: 9, size: 2 };
  const near = game.climateAt(sun, { x: 8, y: 9 });
  const mid = game.climateAt(sun, { x: 5, y: 5 });
  const far = game.climateAt(sun, { x: 0, y: 0 });
  assert.ok(near.heat > mid.heat && mid.heat > far.heat);
  assert.ok(near.energy > mid.energy && mid.energy > far.energy, 'plus d’énergie solaire au chaud');
  assert.ok(near.minerals > far.minerals, 'plus de minéraux au chaud');
  assert.ok(mid.food > near.food && mid.food > far.food, 'la nourriture pousse mieux en zone tempérée');

  // Même planète, avec et sans climat : la production suit les facteurs.
  const base = game.planetsFor('gtest')[0];
  const flat = game.newPlanet('human', T0, { ...base, climate: undefined });
  const hot = game.newPlanet('human', T0, { ...base, climate: near });
  const a = game.stateAt(flat, T0).prod.in;
  const b = game.stateAt(hot, T0).prod.in;
  assert.ok(Math.abs(b.energy - a.energy * near.energy) < 1e-9);
  assert.ok(b.minerals > a.minerals);
  assert.ok(b.food < a.food);
  assert.ok(game.planetsFor('gtest').every((w) => w.climate && w.climate.heat >= 0 && w.climate.heat <= 1));
});

test('chaque niveau de bâtiment prend une place : une planète pleine ne construit plus', () => {
  const worlds = game.planetsFor('gtest');
  for (const w of worlds) {
    const [lo, hi] = w.kind === 'planet' ? game.PLANET_PLACES : game.SMALL_BODIES[w.kind].places;
    assert.ok(w.places >= lo && w.places <= hi, `${w.name} : ${w.places} places`);
  }
  // Les petits corps ont moins de gisements qu'une planète.
  const small = worlds.filter((w) => w.kind !== 'planet');
  assert.ok(small.every((w) => w.nature.minerals.max <= game.NATURE.minerals.max[1] * 0.35 + 100));
  const p = game.newPlanet('human', T0, worlds[0]);
  p.stock = { minerals: 1e6, food: 1e6, energy: 1e6 };
  p.levels.store = 9;
  p.levels.mine = p.places - game.usedPlaces(p.levels) + p.levels.mine; // toutes les places prises
  assert.equal(game.placesLeft(p), 0);
  assert.match(game.startBuild(p, 'mine', T0), /Plus de place/);
});

test('les places viennent de la carte : les effacer ou un niveau négatif ne libère rien', async () => {
  const { newGame } = await import('./harness.mjs');
  const { players: [A] } = newGame(1, ['human']);
  const pl = A.state.players[A.me].planet;
  pl.stock = { minerals: 1e6, food: 1e6, energy: 1e6 };
  pl.levels.mine += pl.places - game.usedPlaces(pl.levels); // pleine
  delete pl.places; // fiche trafiquée
  A.build('farm');
  assert.equal(pl.queue, null, 'toujours pleine');
  const { normalize } = await import('../js/session.js');
  const p = normalize({ race: 'human', planet: { ...pl, levels: { ...pl.levels, mine: -20, x: 1e9 } } });
  assert.equal(p.planet.levels.mine, 0);
  assert.equal(p.planet.levels.x, undefined);
});

test('une colonie humaine sur le plus petit corps garde des places libres', () => {
  for (const b of Object.values(game.SMALL_BODIES)) {
    const p = game.newPlanet('human', T0, { nature: game.planetsFor('gtest')[0].nature, reserve: {}, places: b.places[0], kind: 'comet' });
    assert.ok(game.placesLeft(p) >= 2, `${b.label} : ${game.placesLeft(p)} place(s) libre(s)`);
  }
});

test('déconstruire un niveau rend la moitié de son prix et libère sa place à la fin', () => {
  const p = planet('human');
  p.places = game.usedPlaces(p.levels); // planète pleine
  assert.equal(typeof game.startBuild(p, 'mine', T0), 'string', 'pleine : on ne bâtit plus');
  const before = p.stock.minerals;
  const cost = game.upgradeCost('human', 'mine', 3); // le 4ᵉ niveau
  assert.equal(game.startDemolish(p, 'mine', T0), null);
  assert.equal(p.stock.minerals, before + Math.floor(cost.minerals / 2), 'la moitié du prix revient tout de suite');
  assert.equal(p.levels.mine, 4, 'le niveau tient jusqu’à la fin du chantier');
  assert.equal(typeof game.startBuild(p, 'farm', T0), 'string', 'le chantier est occupé');
  game.settle(p, p.queue.end);
  assert.equal(p.levels.mine, 3);
  assert.equal(game.placesLeft(p), 1, 'une place libre');
  assert.equal(game.startDemolish(p, 'lab', p.at), 'Rien à déconstruire.');
});

test('D-106 : le plus grand lot de vaisseaux suit le stock, et le chantier l’accepte', async () => {
  const { SHIPS, shipUnlock } = await import('../js/tech.js');
  const { shipsAffordable, startShips, newPlanet } = game;
  const p = newPlanet('human', T0);
  p.levels.yard = 1;
  const type = 'cargo';
  if (shipUnlock('human', type)) p.tech = { ...p.tech, [shipUnlock('human', type).key]: shipUnlock('human', type).level };
  const [r, v] = Object.entries(SHIPS.human[type].cost).find(([, x]) => x > 0);
  const fill = () => { for (const k of Object.keys(p.stock)) p.stock[k] = 1e9; };
  fill();
  p.stock[r] = v * 3 + v / 2; // de quoi payer 3 vaisseaux et demi
  assert.equal(shipsAffordable('human', type, p.stock), 3);
  fill();
  assert.equal(shipsAffordable('human', type, p.stock), 50, 'pas plus de 50 par lot');
  assert.equal(shipsAffordable('human', 'inconnu', p.stock), 0);
  assert.equal(shipsAffordable('human', type, {}), 0);
  p.stock[r] = v * 3;
  assert.equal(startShips(p, type, shipsAffordable('human', type, p.stock), T0), null);
  assert.equal(p.yard.count, 3);
});
