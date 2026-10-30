// Décisions de docs/decisions.md sur l'économie, la planète, les races, le
// climat, le soleil, les places et les technologies : chaque test vérifie ce
// que dit la décision (son numéro est dans le nom du test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game, fleet, newGame, Session, clone } from './harness.mjs';

const { TECHS, SHIPS, techCost, researchDuration } = await import('../js/tech.js');

const T0 = 10_000_000;
const MIN = 60_000;
/** Une heure de jeu, en ms réelles (D-083 : 1 / TEMPO minute). */
const GH = MIN / game.TEMPO;
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** Planète posée sur un monde de la carte `gtest` (gisements et climat compris). */
const onWorld = (race, i = 0) => game.newPlanet(race, T0, game.planetsFor('gtest')[i]);

test('D-002 (modifiée par D-083) : une heure de jeu dure 1 / TEMPO minute réelle (SPEED = 60 × TEMPO)', () => {
  assert.equal(game.SPEED, 60 * game.TEMPO);
  // Planète sans gisement ni population : la production est linéaire.
  const p = game.newPlanet('machine', T0);
  const perHour = game.flows('machine', p.levels, 0, p.stock, 1).net.minerals;
  assert.ok(perHour > 0);
  const before = p.stock.minerals;
  game.settle(p, T0 + GH);
  close(p.stock.minerals - before, perHour);
});

test('D-011 : trois races, trois ressources, race choisie une fois pour toutes', () => {
  assert.deepEqual(game.RACE_KEYS, ['human', 'machine', 'alien']);
  assert.deepEqual(game.RES, ['minerals', 'food', 'energy']);
  const { players: [A] } = newGame(1, ['human']);
  assert.equal(A.chooseRace('alien'), false, 'second choix refusé');
  assert.equal(A.myRace, 'human');
});

test('D-012 : départ serré, entrepôts limités', () => {
  assert.equal(game.storageCap(0), 1000);
  assert.equal(game.storageCap(1), 1700);
  // Au départ, aucune race ne peut payer à la fois le labo et le chantier naval.
  for (const r of game.RACE_KEYS) {
    const R = game.RACES[r];
    const need = game.upgradeCost(r, 'lab', 0).minerals + game.upgradeCost(r, 'yard', 0).minerals;
    assert.ok(R.start.minerals < need, `${r} : ${R.start.minerals} minéraux pour ${need}`);
  }
  // Sans entrepôt, le stock ne dépasse jamais 1 000, même après 10 h.
  const p = game.newPlanet('machine', T0);
  game.settle(p, T0 + 600 * MIN);
  assert.equal(p.stock.minerals, game.storageCap(0));
});

test('D-015 : seuls minéraux et nourriture viennent d’un gisement, l’énergie est sans limite', () => {
  assert.deepEqual(game.SOIL, ['minerals', 'food']);
  for (const w of game.planetsFor('gtest')) assert.deepEqual(Object.keys(w.nature).sort(), ['food', 'minerals']);
  // Sol vide et sans repousse : l'énergie produite ne change pas.
  const dry = onWorld('human');
  delete dry.climate;
  dry.reserve = { minerals: 0, food: 0 };
  for (const k of game.SOIL) dry.nature[k].regen = 0;
  const free = clone(dry);
  delete free.nature;
  delete free.reserve;
  const a = game.stateAt(dry, T0).prod.in;
  const b = game.stateAt(free, T0).prod.in;
  assert.ok(a.energy > 0);
  assert.equal(a.energy, b.energy);
  assert.equal(a.minerals, 0);
  // D-018 : planète d'avant les gisements, sans limite (tout ce que veulent les bâtiments).
  const want = game.stateAt(free, T0).prod.soil.minerals.want;
  assert.ok(want > 0);
  assert.equal(b.minerals, want);
});

test('D-016 : gisement vide = production de base ; sans exploitation, il remonte jusqu’au maximum', () => {
  // Vide : on n'obtient que la repousse, même si les bâtiments en veulent plus.
  const p = onWorld('human');
  p.reserve.minerals = 0;
  p.nature.minerals.regen = 5;
  close(game.stateAt(p, T0).prod.in.minerals, 5);
  const before = p.stock.minerals;
  game.settle(p, T0 + 10 * GH);
  close(p.stock.minerals - before, 5 * 10);
  // Peu exploité : il se remplit, sans dépasser son maximum.
  const q = onWorld('machine');
  q.levels.drill = 0;
  q.reserve.minerals = q.nature.minerals.max - 5000;
  game.settle(q, T0 + 120 * MIN);
  assert.equal(q.reserve.minerals, q.nature.minerals.max);
});

test('D-018 : 14 planètes tirées de l’identifiant de la partie, les mêmes partout', () => {
  assert.equal(game.PLANET_COUNT, 14);
  assert.deepEqual(game.planetsFor('gtest'), game.planetsFor('gtest'));
  assert.notDeepEqual(game.planetsFor('gtest'), game.planetsFor('gautre'));
  assert.equal(game.planetsFor('gtest').filter((w) => w.kind === 'planet').length, 14);
});

test('D-018 : deux joueurs sur la même planète mère, le premier l’emporte', () => {
  const clock = { t: T0 };
  const [A, B] = [0, 1].map((i) => {
    const s = new Session(`J${i}`);
    Object.assign(s, { now: () => clock.t, start() {}, meet() {}, me: `p${i}`, status: 'playing' });
    s.state = { gid: 'gtest', key: 'k', players: {}, log: [] };
    s.addPlayer(s.me, s.name, 'x'.repeat(64));
    s.chooseRace('human');
    return s;
  });
  const sync = (a, b) => a.mergeIn(b.snapshot(), { pid: b.me });
  sync(A, B);
  sync(B, A);
  // A s'installe, puis B, 1 s plus tard, sans avoir vu A (partie coupée).
  assert.ok(A.claimPlanet('p3'));
  clock.t += 1000;
  assert.ok(B.claimPlanet('p3'));
  sync(A, B);
  sync(B, A);
  clock.t += 2000;
  A.tick();
  B.tick();
  assert.ok(A.state.players[A.me].home, 'A, premier, garde sa planète');
  assert.equal(B.state.players[B.me].home, null, 'B la lui laisse');
});

test('D-018 / D-060 : repousse des gisements ×10 (minéraux 150–450/min, nourriture 80–250/min)', () => {
  assert.deepEqual(game.NATURE.minerals.regen, [150, 450]);
  assert.deepEqual(game.NATURE.food.regen, [80, 250]);
  assert.deepEqual(game.NATURE.minerals.max, [60000, 200000]);
  assert.deepEqual(game.NATURE.food.max, [15000, 60000]);
  for (const w of game.planetsFor('gtest').filter((x) => x.kind === 'planet')) {
    for (const k of game.SOIL) {
      const n = w.nature[k];
      assert.ok(n.regen >= game.NATURE[k].regen[0] && n.regen <= game.NATURE[k].regen[1]);
      assert.ok(n.max >= game.NATURE[k].max[0] && n.max <= game.NATURE[k].max[1]);
    }
  }
});

test('D-019 : tout ce qui entre au stock sort du gisement, revenu de base compris', () => {
  const p = onWorld('human');
  p.reserve.minerals = 30000; // loin du maximum : la repousse n'est pas rognée
  const h = 10;
  const stock0 = p.stock.minerals;
  const soil0 = p.reserve.minerals;
  game.settle(p, T0 + h * GH);
  const gained = p.stock.minerals - stock0;
  assert.ok(gained > 0);
  close(gained, soil0 + p.nature.minerals.regen * h - p.reserve.minerals, 1e-6);
});

test('D-019 : l’arrachement ne dépasse ni le gisement ni la place en entrepôt', () => {
  const p = onWorld('alien');
  p.stock.energy = 500;
  p.reserve.minerals = 15;
  assert.equal(game.liftGain(p), 15, 'pas plus que le sol');
  const r = game.usePower(p, 'lift', T0);
  assert.ok(!r.error);
  assert.equal(p.reserve.minerals, 0, 'pris au sol');
  const q = onWorld('alien');
  q.stock.minerals = game.storageCap(0) - 10;
  assert.equal(game.liftGain(q), 10, 'pas plus que la place libre');
});

test('D-021 / D-031 : labo et chantier par race, 7 technologies et 4 vaisseaux par race', () => {
  const labs = new Set();
  for (const r of game.RACE_KEYS) {
    const b = game.RACES[r].buildings;
    assert.ok(b.lab && b.yard, `${r} : labo et chantier`);
    labs.add(b.lab.name);
    assert.equal(Object.keys(TECHS[r]).length, 7);
    assert.deepEqual(Object.keys(SHIPS[r]).sort(), ['cargo', 'colony', 'fighter', 'heavy']);
  }
  assert.equal(labs.size, 3, 'un labo propre à chaque race');
});

test('D-021 : une recherche à la fois, et elle vaut pour toutes les planètes', () => {
  const p = game.newPlanet('human', T0);
  assert.match(game.startResearch(p, 'forage', T0), /labo/);
  p.levels.lab = 1;
  p.stock.minerals = 900;
  assert.equal(game.startResearch(p, 'forage', T0), null);
  assert.match(game.startResearch(p, 'agro', T0), /déjà en cours/);

  // La colonie reçoit les technologies de la planète mère.
  const { players: [A] } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  const w = A.planets.find((x) => x.id === 'a0');
  me.colonies = { a0: { ...game.newPlanet('human', T0, w), claimAt: T0 } };
  me.planet.tech = { forage: 2 };
  A.tick();
  assert.deepEqual(me.colonies.a0.tech, { forage: 2 });
});

test('D-098 : recherche sur toute planète qui a un labo, selon le niveau de ce labo', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  const toasts = [];
  A.ontoast = (m) => toasts.push(m);
  const w = A.planets.find((x) => x.id === 'a0');
  me.colonies = { a0: { ...game.newPlanet('human', clock.t, w), claimAt: clock.t } };
  const col = me.colonies.a0;
  // Sans labo dans la colonie : refusé.
  A.research('forage', 'a0');
  assert.ok(!col.research);
  assert.match(toasts.at(-1), /labo/);
  // Labo 1 dans la colonie : Blindage (labo 2) reste fermé, même si la planète mère a un labo 2.
  col.levels.lab = 1;
  col.stock.minerals = 5000;
  me.planet.levels.lab = 2;
  me.planet.tech = { propulsion: 1 };
  A.research('blindage', 'a0');
  assert.ok(!col.research);
  assert.match(toasts.at(-1), /labo niv. 2/);
  // Propulsion niv. 2 : lancée dans la colonie, payée par la colonie.
  const before = col.stock.minerals;
  A.research('propulsion', 'a0');
  assert.equal(col.research?.key, 'propulsion');
  assert.equal(col.research.level, 2, 'le niveau part des technologies de l’empire');
  assert.ok(col.stock.minerals < before);
  // La durée vient du labo de la colonie (niv. 1), pas de celui de la planète mère (niv. 2).
  const cost = techCost('human', 'propulsion', 1);
  assert.equal(col.research.end - col.research.start, researchDuration(cost, 1));
  assert.notEqual(researchDuration(cost, 1), researchDuration(cost, 2));
  // La même technologie ne peut pas être lancée ailleurs en même temps ; une autre, si.
  me.planet.stock.minerals = 5000;
  A.research('propulsion', 'home');
  assert.ok(!me.planet.research);
  assert.match(toasts.at(-1), /déjà en recherche/);
  A.research('agro', 'home');
  assert.equal(me.planet.research?.key, 'agro');
  // À la fin, la technologie trouvée dans la colonie vaut pour toutes mes planètes.
  clock.t = Math.max(col.research.end, me.planet.research.end) + 1000;
  A.tick();
  assert.equal(me.planet.tech.propulsion, 2);
  assert.equal(col.tech.propulsion, 2);
  assert.equal(col.tech.agro, 1);
  // Plus rien à partager : un passage de plus ne change rien.
  let changed = 0;
  A.changed = () => changed++;
  clock.t += 1000;
  A.tick();
  assert.equal(changed, 0);
});

test('D-038 : consommation des machines doublée (carburant par case)', () => {
  // Avant le lot 7 : 0,5 / 1,5 / 0,5 / 1,5 par case.
  const m = SHIPS.machine;
  assert.deepEqual([m.cargo.burn, m.colony.burn, m.fighter.burn, m.heavy.burn], [1, 3, 1, 3]);
  assert.equal(m.fighter.burn, SHIPS.human.fighter.burn, 'autant par case que les humains');
});

test('D-048 : l’arbre des technologies est un graphe avec bâtiments, technologies, vaisseaux et pouvoirs', async () => {
  // La page tourne dans le navigateur : un faux DOM juste assez grand.
  const els = new Map();
  const el = () => ({ innerHTML: '', textContent: '', style: { setProperty() {} }, addEventListener() {}, querySelectorAll: () => [], classList: { toggle() {} } });
  Object.assign(document, {
    getElementById: (id) => (els.has(id) ? els.get(id) : els.set(id, el()).get(id)),
    querySelectorAll: () => [],
    documentElement: { style: { setProperty() {} } },
  });
  globalThis.history = { replaceState() {} };
  globalThis.addEventListener = () => {};
  const graphOf = async (race) => {
    globalThis.location = { hash: `#${race}` };
    els.clear();
    await import(`../js/techtree.js?${race}`);
    return els.get('graph').innerHTML;
  };
  for (const race of game.RACE_KEYS) {
    const svg = await graphOf(race);
    for (const kind of ['building', 'tech', 'ship']) assert.match(svg, new RegExp(`class="gnode ${kind}"`), `${race} : ${kind}`);
    for (const kind of ['req', 'unlock', 'bld']) assert.match(svg, new RegExp(`class="edge ${kind}"`), `${race} : flèche ${kind}`);
    assert.match(svg, /class="edge bld" data-from="b:lab"/, `${race} : le labo mène aux premières technologies`);
    assert.match(svg, /class="edge bld" data-from="b:yard"/, `${race} : le chantier mène aux vaisseaux`);
    const count = (k) => (svg.match(new RegExp(`class="gnode ${k}"`, 'g')) || []).length;
    assert.equal(count('tech'), Object.keys(TECHS[race]).length);
    assert.equal(count('ship'), 4);
    assert.equal(count('power'), race === 'alien' ? game.POWER_KEYS.length : 0, `${race} : pouvoirs`);
  }
});

test('D-053 : le soleil 3 × 3 est décalé d’une demi-case, et les flottes le traversent en ligne droite', () => {
  let gid = 0;
  while (game.sunFor(`s${gid}`).size !== 3) gid++;
  const sun = game.sunFor(`s${gid}`);
  assert.equal(sun.x + sun.size / 2 - game.UNIVERSE.w / 2, -0.5);
  // De part et d'autre du soleil, à travers lui : trajet direct, sans détour.
  const y = sun.y + 1;
  const f = { ships: { fighter: 1 }, cargo: {}, fuel: 1000, from: { x: 0, y }, to: { x: 0, y }, depart: T0, arrive: T0 };
  assert.equal(fleet.moveTo(f, 'human', {}, { x: 19, y }, null, T0), null);
  assert.deepEqual(f.to, { x: 19, y });
  assert.equal(f.arrive - T0, fleet.tripMs({ x: 0, y }, { x: 19, y }, fleet.fleetSpeed('human', f.ships, {})));
  close(f.arrive - T0, ((19 / SHIPS.human.fighter.speed) * MIN) / game.TEMPO, 1); // vitesse en cases par heure de jeu (D-083)
});

test('D-056 : les petits corps ne servent pas de départ', () => {
  const { players: [A] } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  me.home = null;
  me.planet = null;
  assert.equal(A.claimPlanet('a0'), false);
  assert.equal(A.claimPlanet('c0'), false);
  assert.equal(me.home, null);
});

test('D-056 : un astéroïde se colonise', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const target = A.planets.find((w) => w.kind === 'asteroid');
  const cell = { x: target.x, y: target.y };
  const pl = A.state.players[A.me].planet;
  Object.assign(pl, { ships: { colony: 1 }, stock: { ...pl.stock, energy: 900 } });
  const id = A.takeOff('home', { colony: 1 }, {}, 50);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell } });
  A.moveFleet(id, cell, 'colonize');
  clock.t += 1000;
  A.tick();
  assert.ok(A.state.players[A.me].colonies?.[target.id], 'colonie fondée sur l’astéroïde');
});

test('D-058 : planètes 14–22 places, astéroïdes 7–10, comètes 6–8 avec des minéraux', () => {
  assert.deepEqual(game.PLANET_PLACES, [14, 22]);
  assert.deepEqual(game.SMALL_BODIES.asteroid.places, [7, 10]);
  assert.deepEqual(game.SMALL_BODIES.comet.places, [6, 8]);
  assert.ok(game.SMALL_BODIES.comet.share.minerals > 0);
  for (const w of game.planetsFor('gtest').filter((x) => x.kind === 'comet')) assert.ok(w.nature.minerals.max > 0);
});

test('D-058 : tirage uniforme des places (les bornes sortent aussi souvent que le reste)', () => {
  const seen = {};
  for (let i = 0; i < 600; i++) for (const w of game.planetsFor(`u${i}`)) if (w.kind === 'planet') seen[w.places] = (seen[w.places] || 0) + 1;
  const counts = Object.values(seen);
  assert.equal(counts.length, 9, 'de 14 à 22');
  // 600 × 14 tirages, ≈ 933 par valeur : un tirage arrondi donnerait ≈ 470 aux bornes.
  assert.ok(Math.min(...counts) / Math.max(...counts) > 0.8, JSON.stringify(seen));
});

test('D-060 : entrepôts hors du score, mine humaine 36, impôt 0,4 par habitant', () => {
  assert.equal(game.score('human', { mine: 2, store: 6 }), game.score('human', { mine: 2 }));
  assert.ok(game.score('human', { mine: 2 }) > 0);
  const r = game.RACES.human.rates({ mine: 1 }, 100);
  close(r.minerals(1), 36 * 1.1);
  close(r.mineralsBase, 10 + 0.4 * 100);
});

test('D-060 : climat adouci (énergie ×0,8–×1,2, minéraux ×0,9–×1,1, nourriture ×0,6–×1,3)', () => {
  const sun = game.sunFor('gtest');
  const all = [];
  for (let x = 0; x < game.UNIVERSE.w; x++) for (let y = 0; y < game.UNIVERSE.h; y++) all.push(game.climateAt(sun, { x, y }));
  for (const c of all) {
    close(c.energy, 0.8 + 0.4 * c.heat, 0.006);
    close(c.minerals, 0.9 + 0.2 * c.heat, 0.006);
    close(c.food, 1.3 - 1.4 * Math.abs(c.heat - 0.5), 0.006);
    assert.ok(c.energy >= 0.8 && c.energy <= 1.2 && c.minerals >= 0.9 && c.minerals <= 1.1 && c.food >= 0.6 && c.food <= 1.3);
  }
  // Aux deux bouts : glacé (chaleur 0) et brûlant (chaleur 1).
  const cold = game.climateAt(sun, { x: -100, y: -100 });
  const hot = game.climateAt(sun, { x: sun.x, y: sun.y });
  assert.deepEqual([cold.heat, cold.energy, cold.minerals, cold.food], [0, 0.8, 0.9, 0.6]);
  assert.deepEqual([hot.heat, hot.energy, hot.minerals, hot.food], [1, 1.2, 1.1, 0.6]);
});

test('D-060 : pouvoirs aliens (arrachement 40, transe 25 par psionique), transe refusée sur sol vide', () => {
  const p = onWorld('alien');
  p.pop = 2;
  assert.equal(game.liftGain(p, 1), 80);
  assert.equal(game.powerCost(p, 'trance', 3).energy, 75);
  p.stock.energy = 500;
  p.reserve.minerals = 0;
  p.nature.minerals.regen = 0;
  const before = clone(p);
  assert.ok(game.usePower(p, 'trance', T0).error, 'sol vide : refusée');
  assert.equal(p.stock.energy, before.stock.energy, 'rien payé');
  assert.equal(p.trance, undefined);
});

test('D-070 : « Nourriture » dans les stocks du joueur', () => {
  assert.equal(game.RES_INFO.food.name, 'Nourriture');
});

test('D-074 : seuls les aliens ont des pouvoirs', () => {
  for (const r of ['human', 'machine']) {
    const p = onWorld(r);
    p.stock.energy = 500;
    assert.ok(game.usePower(p, 'lift', T0).error, r);
  }
});
