// Décisions de docs/decisions.md sur l'économie, la planète, les races, le
// climat, le soleil, les places et les technologies : chaque test vérifie ce
// que dit la décision (son numéro est dans le nom du test).
//
// Tous sont des scénarios (D-129) : chacun filme ce que voit un joueur d'une vraie partie. Quand
// la décision porte sur une planète, cette planète devient celle du joueur, et le joueur touche
// sa planète mère : le rapport ouvre sa fiche, avec les stocks et la production vérifiés.
import assert from 'node:assert/strict';
import { game, fleet, newGame, Session, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { TECHS, SHIPS, techCost, researchDuration } = await import('../js/tech.js');
const scenario = scenarios(import.meta.url);

const T0 = 10_000_000;
const MIN = 60_000;
/** Une heure de jeu, en ms réelles (D-083 : 1 / TEMPO minute). */
const GH = MIN / game.TEMPO;
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

/** Planète posée sur un monde de la carte `gtest` (gisements et climat compris). */
const onWorld = (race, i = 0) => game.newPlanet(race, T0, game.planetsFor('gtest')[i]);

/**
 * Partie à un joueur (horloge à T0) dont la planète mère devient `p` : ce que le test vérifie sur
 * `p`, le joueur le voit dans la fiche de sa planète. `onWorld(race)` est d'ailleurs le monde même
 * de sa planète mère (le premier de la carte).
 */
function playing(p) {
  const { players: [A], clock } = newGame(1, [p.race]);
  const me = A.state.players[A.me];
  me.planet = p;
  return { A, clock, me, home: { ...me.home } };
}

/** Le joueur touche sa planète mère : sa fiche s'ouvre, avec le bouton « Voir la planète ». */
const mine = (home) => [{ sheet: home, button: true }];

scenario('D-002 (modifiée par D-083) : une heure de jeu dure 1 / TEMPO minute réelle (SPEED = 60 × TEMPO)', (film) => {
  assert.equal(game.SPEED, 60 * game.TEMPO);
  // Planète sans gisement ni population : la production est linéaire.
  const p = game.newPlanet('machine', T0);
  const { A, clock, home } = playing(p);
  const perHour = game.flows('machine', p.levels, 0, p.stock, 1).net.minerals;
  assert.ok(perHour > 0);
  const before = p.stock.minerals;
  film.look(A, `planète de A sans gisement : ${perHour} minéraux par heure de jeu`, mine(home));
  film.roll(A, clock, T0 + GH, `une heure de jeu passe (${GH / 1000} s réelles)`);
  game.settle(p, T0 + GH);
  film.look(A, 'une heure de jeu plus tard : une heure de production en plus', mine(home));
  close(p.stock.minerals - before, perHour);
});

scenario('D-011 : trois races, trois ressources, race choisie une fois pour toutes', (film) => {
  assert.deepEqual(game.RACE_KEYS, ['human', 'machine', 'alien']);
  assert.deepEqual(game.RES, ['minerals', 'food', 'energy']);
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'A a choisi les humains et s’est installé', [
    { show: 'races', expected: ['human', 'machine', 'alien'], got: game.RACE_KEYS },
    { show: 'ressources', expected: ['minerals', 'food', 'energy'], got: game.RES },
  ]);
  const again = A.chooseRace('alien');
  assert.equal(again, false, 'second choix refusé');
  film.look(A, 'A tente de passer alien : refusé, il reste humain', [
    { show: 'passer alien', expected: false, got: again },
    { show: 'race', at: A.state.players[A.me].home, expected: 'human', got: A.myRace },
  ]);
  assert.equal(A.myRace, 'human');
});

scenario('D-012 : départ serré, entrepôts limités', (film) => {
  assert.equal(game.storageCap(0), 1000);
  assert.equal(game.storageCap(1), 1700);
  // Au départ, aucune race ne peut payer à la fois le labo et le chantier naval.
  // (Coûts des tables : vérifiés par les asserts seulement ; l'image montre le stock de départ.)
  for (const r of game.RACE_KEYS) {
    const R = game.RACES[r];
    const need = game.upgradeCost(r, 'lab', 0).minerals + game.upgradeCost(r, 'yard', 0).minerals;
    assert.ok(R.start.minerals < need, `${r} : ${R.start.minerals} minéraux pour ${need}`);
  }
  // Sans entrepôt, le stock ne dépasse jamais 1 000, même après 10 h.
  const p = game.newPlanet('machine', T0);
  const { A, clock, home } = playing(p);
  film.look(A, 'A, machine, au départ : stock de départ, sans entrepôt', mine(home));
  // 10 h réelles : deux images (avant, après), pas un film de 240 images.
  clock.t = T0 + 600 * MIN;
  game.settle(p, T0 + 600 * MIN);
  film.look(A, '10 h plus tard : les minéraux plafonnent à 1 000', mine(home));
  assert.equal(p.stock.minerals, game.storageCap(0));
});

scenario('D-015 : seuls minéraux et nourriture viennent d’un gisement, l’énergie est sans limite', (film) => {
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
  // Deux parties : A sur la planète au sol vide, B (une autre partie) sur la même sans gisement.
  const a1 = playing(dry);
  const b1 = playing(free);
  const a = game.stateAt(dry, T0).prod.in;
  const b = game.stateAt(free, T0).prod.in;
  film.look(a1.A, 'planète au sol vide : plus de minéraux, l’énergie continue', mine(a1.home));
  film.look(b1.A, 'la même sans gisement (d’avant D-018) : même énergie, minéraux sans limite', mine(b1.home));
  assert.ok(a.energy > 0);
  assert.equal(a.energy, b.energy);
  assert.equal(a.minerals, 0);
  // D-018 : planète d'avant les gisements, sans limite (tout ce que veulent les bâtiments).
  const want = game.stateAt(free, T0).prod.soil.minerals.want;
  assert.ok(want > 0);
  assert.equal(b.minerals, want);
});

scenario('D-016 : gisement vide = production de base ; sans exploitation, il remonte jusqu’au maximum', (film) => {
  // Vide : on n'obtient que la repousse, même si les bâtiments en veulent plus.
  const p = onWorld('human');
  p.reserve.minerals = 0;
  p.nature.minerals.regen = 5;
  const { A, clock, home } = playing(p);
  film.look(A, 'gisement de minéraux vide, repousse 5 par heure de jeu', mine(home));
  close(game.stateAt(p, T0).prod.in.minerals, 5);
  const before = p.stock.minerals;
  film.roll(A, clock, T0 + 10 * GH, '10 heures de jeu passent');
  game.settle(p, T0 + 10 * GH);
  film.look(A, '10 heures de jeu plus tard : 50 minéraux de plus, rien que la repousse', mine(home));
  close(p.stock.minerals - before, 5 * 10);
  // Peu exploité : il se remplit, sans dépasser son maximum (une autre partie, une machine sans foreuse).
  const q = onWorld('machine');
  q.levels.drill = 0;
  q.reserve.minerals = q.nature.minerals.max - 5000;
  const m = playing(q);
  film.look(m.A, 'machine sans foreuse : gisement 5 000 sous son maximum', mine(m.home));
  m.clock.t = T0 + 120 * MIN;
  game.settle(q, T0 + 120 * MIN);
  film.look(m.A, '2 h plus tard : gisement plein, pas au-delà', mine(m.home));
  assert.equal(q.reserve.minerals, q.nature.minerals.max);
});

scenario('D-018 : 14 planètes tirées de l’identifiant de la partie, les mêmes partout', (film) => {
  // L'image montre la carte de la partie `gtest` et ses planètes ; l'identique d'un téléphone à
  // l'autre et la différence avec une autre partie sont vérifiés par les asserts.
  const { players: [A, B] } = newGame(2);
  film.look(A, 'la carte de la partie gtest, vue par A : 14 planètes, une autre partie en a d’autres', [
    { show: 'planètes', expected: 14, got: game.planetsFor('gtest').filter((w) => w.kind === 'planet').length },
    { show: 'même carte que la partie gautre', expected: false, got: JSON.stringify(game.planetsFor('gtest')) === JSON.stringify(game.planetsFor('gautre')) },
  ]);
  film.look(B, 'la même carte, vue par B', [{ show: 'même carte que chez A', expected: true, got: JSON.stringify(B.planets) === JSON.stringify(A.planets) }]);
  assert.equal(game.PLANET_COUNT, 14);
  assert.deepEqual(game.planetsFor('gtest'), game.planetsFor('gtest'));
  assert.notDeepEqual(game.planetsFor('gtest'), game.planetsFor('gautre'));
  assert.equal(game.planetsFor('gtest').filter((w) => w.kind === 'planet').length, 14);
});

scenario('D-018 : deux joueurs sur la même planète mère, le premier l’emporte', (film) => {
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
  film.look(A, 'A et B humains, pas encore installés');
  // A s'installe, puis B, 1 s plus tard, sans avoir vu A (partie coupée).
  assert.ok(A.claimPlanet('p3'));
  film.look(A, 'A s’installe sur p3');
  clock.t += 1000;
  assert.ok(B.claimPlanet('p3'));
  film.look(A, '1 s plus tard, B s’installe aussi sur p3 (A ne le sait pas encore)');
  sync(A, B);
  sync(B, A);
  film.look(A, 'A et B échangent leurs fiches : tous deux sur p3');
  clock.t += 2000;
  A.tick();
  B.tick();
  const p3 = A.planets.find((w) => w.id === 'p3');
  film.look(A, '2 s plus tard, après un passage : A, premier, garde p3 (B la lui laisse, chez lui)', [
    { show: 'planète mère de A', at: p3, expected: 'p3', got: A.state.players[A.me].home ? 'p3' : 'aucune' },
    { show: 'planète mère de B, chez B', expected: 'aucune', got: B.state.players[B.me].home ? 'une' : 'aucune' },
  ]);
  assert.ok(A.state.players[A.me].home, 'A, premier, garde sa planète');
  assert.equal(B.state.players[B.me].home, null, 'B la lui laisse');
});

scenario('D-018 / D-060 : repousse des gisements ×10 (minéraux 150–450/min, nourriture 80–250/min)', (film) => {
  // L'image montre la fiche de la planète mère de A, dont le gisement est l'un de ceux vérifiés ;
  // les bornes des 14 planètes sont vérifiées par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'A touche sa planète mère : gisements et repousse dans les bornes', mine({ ...A.state.players[A.me].home }));
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

scenario('D-019 : tout ce qui entre au stock sort du gisement, revenu de base compris', (film) => {
  const p = onWorld('human');
  p.reserve.minerals = 30000; // loin du maximum : la repousse n'est pas rognée
  const { A, clock, home } = playing(p);
  const h = 10;
  const stock0 = p.stock.minerals;
  const soil0 = p.reserve.minerals;
  film.look(A, 'gisement de minéraux à 30 000', mine(home));
  film.roll(A, clock, T0 + h * GH, `${h} heures de jeu passent`);
  game.settle(p, T0 + h * GH);
  film.look(A, `${h} heures de jeu plus tard : le stock a pris au gisement ce qu’il a gagné`, mine(home));
  const gained = p.stock.minerals - stock0;
  assert.ok(gained > 0);
  close(gained, soil0 + p.nature.minerals.regen * h - p.reserve.minerals, 1e-6);
});

scenario('D-019 : l’arrachement ne dépasse ni le gisement ni la place en entrepôt', (film) => {
  const p = onWorld('alien');
  p.stock.energy = 500;
  p.reserve.minerals = 15;
  const a = playing(p);
  film.look(a.A, 'alien, 15 minéraux dans le sol', mine(a.home));
  assert.equal(game.liftGain(p), 15, 'pas plus que le sol');
  const r = game.usePower(p, 'lift', T0);
  film.look(a.A, 'après l’arrachement : 15 minéraux pris, sol vide', mine(a.home));
  assert.ok(!r.error);
  assert.equal(p.reserve.minerals, 0, 'pris au sol');
  const q = onWorld('alien');
  q.stock.minerals = game.storageCap(0) - 10;
  const b = playing(q);
  film.look(b.A, 'autre partie : entrepôt à 10 minéraux du plein, l’arrachement n’en donnerait que 10', mine(b.home));
  assert.equal(game.liftGain(q), 10, 'pas plus que la place libre');
});

scenario('D-021 / D-031 : labo et chantier par race, 7 technologies et 4 vaisseaux par race', (film) => {
  // Les tables des races ne se voient pas sur la carte : une image par race montre la planète mère
  // du joueur (fiche ouverte), où il trouve labo et chantier ; le reste est vérifié par les asserts.
  const { players } = newGame(3, ['human', 'machine', 'alien']);
  for (const s of players) film.look(s, `${s.myRace} : sa planète mère, avec labo et chantier`, mine({ ...s.state.players[s.me].home }));
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

scenario('D-021 : une recherche à la fois, et elle vaut pour toutes les planètes', (film) => {
  const p = game.newPlanet('human', T0);
  const noLab = game.startResearch(p, 'forage', T0);
  assert.match(noLab, /labo/);
  p.levels.lab = 1;
  p.stock.minerals = 900;
  const first = game.startResearch(p, 'forage', T0);
  assert.equal(first, null);
  const second = game.startResearch(p, 'agro', T0);
  assert.match(second, /déjà en cours/);

  // La colonie reçoit les technologies de la planète mère.
  const { players: [A] } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  const w = A.planets.find((x) => x.id === 'a0');
  me.colonies = { a0: { ...game.newPlanet('human', T0, w), claimAt: T0 } };
  me.planet.tech = { forage: 2 };
  film.look(A, 'A a une colonie sur a0 ; sa planète mère connaît Forage 2 ; en légende, une recherche à la fois', [
    { show: 'recherche sans labo', expected: 'refusée (labo)', got: noLab, ok: /labo/.test(noLab) },
    { show: 'avec un labo', expected: 'lancée', got: first === null ? 'lancée' : first },
    { show: 'une deuxième en même temps', expected: 'refusée (déjà en cours)', got: second, ok: /déjà en cours/.test(second) },
  ]);
  A.tick();
  film.look(A, 'après un passage : la colonie a reçu Forage 2', [{ show: 'technologies de la colonie', at: w, expected: { forage: 2 }, got: me.colonies.a0.tech }]);
  assert.deepEqual(me.colonies.a0.tech, { forage: 2 });
});

scenario('D-098 : recherche sur toute planète qui a un labo, selon le niveau de ce labo', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  const toasts = [];
  A.ontoast = (m) => toasts.push(m);
  const w = A.planets.find((x) => x.id === 'a0');
  me.colonies = { a0: { ...game.newPlanet('human', clock.t, w), claimAt: clock.t } };
  const col = me.colonies.a0;
  film.look(A, 'A a une colonie sur a0, sans labo');
  // Sans labo dans la colonie : refusé.
  A.research('forage', 'a0');
  assert.ok(!col.research);
  assert.match(toasts.at(-1), /labo/);
  // Labo 1 dans la colonie : Blindage (labo 2) reste fermé, même si la planète mère a un labo 2.
  col.levels.lab = 1;
  col.stock.minerals = 5000;
  me.planet.levels.lab = 2;
  me.planet.tech = { propulsion: 1 };
  film.look(A, 'labo 1 dans la colonie, labo 2 sur la planète mère');
  A.research('blindage', 'a0');
  assert.ok(!col.research);
  assert.match(toasts.at(-1), /labo niv. 2/);
  // Propulsion niv. 2 : lancée dans la colonie, payée par la colonie.
  const before = col.stock.minerals;
  A.research('propulsion', 'a0');
  const took = col.research ? col.research.end - col.research.start : null;
  film.look(A, 'la colonie lance Propulsion 2 et la paie ; sa durée vient de son labo (niv. 1)', [
    { show: 'recherche de la colonie', at: w, expected: 'propulsion 2', got: col.research ? `${col.research.key} ${col.research.level}` : 'aucune' },
    { show: 'payée par la colonie', at: w, expected: true, got: col.stock.minerals < before },
    { show: 'durée, en min', expected: researchDuration(techCost('human', 'propulsion', 1), 1) / MIN, got: took / MIN },
  ]);
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
  const busy = toasts.at(-1);
  assert.match(busy, /déjà en recherche/);
  A.research('agro', 'home');
  film.look(A, 'la planète mère lance Agronomie (Propulsion refusée : déjà en recherche)', [
    { show: 'Propulsion sur la planète mère', expected: 'refusée (déjà en recherche)', got: busy, ok: /déjà en recherche/.test(busy) },
    { show: 'recherche de la planète mère', at: me.home, expected: 'agro', got: me.planet.research?.key },
  ]);
  assert.equal(me.planet.research?.key, 'agro');
  // À la fin, la technologie trouvée dans la colonie vaut pour toutes mes planètes.
  clock.t = Math.max(col.research.end, me.planet.research.end) + 1000;
  A.tick();
  film.look(A, 'les deux recherches finies : elles valent pour toutes les planètes de A', [
    { show: 'planète mère', at: me.home, expected: { propulsion: 2, agro: 1 }, got: { propulsion: me.planet.tech.propulsion, agro: me.planet.tech.agro } },
    { show: 'colonie', at: w, expected: { propulsion: 2, agro: 1 }, got: { propulsion: col.tech.propulsion, agro: col.tech.agro } },
  ]);
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

scenario('D-038 : consommation des machines doublée (carburant par case)', (film) => {
  // Le carburant par case est une table : l'image montre un chasseur machine en route (son
  // réservoir baisse case après case) ; la valeur exacte est vérifiée par les asserts.
  const { players: [A], clock } = newGame(1, ['machine']);
  const pl = A.state.players[A.me].planet;
  Object.assign(pl, { ships: { fighter: 1 }, stock: { ...pl.stock, energy: 900 } });
  const id = A.takeOff('home', { fighter: 1 }, {}, fleet.fleetTank('machine', { fighter: 1 }));
  assert.ok(id, 'décollage accepté');
  const f = A.myFleet(id);
  assert.ok(A.moveFleet(id, { x: f.from.x + 3, y: f.from.y }), 'départ accepté');
  film.look(A, 'un chasseur machine part à 3 cases, le plein fait', [{ fleet: [A, id], visible: true }]);
  clock.t = A.myFleet(id).arrive;
  film.look(A, 'arrivé : 3 cases de carburant brûlées', [{ fleet: [A, id], visible: true }]);
  // Avant le lot 7 : 0,5 / 1,5 / 0,5 / 1,5 par case.
  const m = SHIPS.machine;
  assert.deepEqual([m.cargo.burn, m.colony.burn, m.fighter.burn, m.heavy.burn], [1, 3, 1, 3]);
  assert.equal(m.fighter.burn, SHIPS.human.fighter.burn, 'autant par case que les humains');
});

scenario('D-048 : l’arbre des technologies est un graphe avec bâtiments, technologies, vaisseaux et pouvoirs', async (film) => {
  // L'arbre est une page à part (techtree.html), pas l'écran de jeu : l'image montre la planète
  // mère de chaque race (fiche ouverte), d'où le joueur ouvre l'arbre ; le graphe est vérifié par
  // les asserts. Les images d'abord : le faux DOM ci-dessous remplace celui du harnais.
  const { players } = newGame(3, ['human', 'machine', 'alien']);
  for (const s of players) film.look(s, `${s.myRace} : sa planète mère, d’où il ouvre l’arbre des technologies`, mine({ ...s.state.players[s.me].home }));
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

scenario('D-053 : le soleil 3 × 3 est décalé d’une demi-case, et les flottes le traversent en ligne droite', (film) => {
  let gid = 0;
  while (game.sunFor(`s${gid}`).size !== 3) gid++;
  const sun = game.sunFor(`s${gid}`);
  assert.equal(sun.x + sun.size / 2 - game.UNIVERSE.w / 2, -0.5);
  // Une partie sur cette carte-là (soleil 3 × 3), comme newGame mais avec son identifiant : la
  // flotte du test est celle du joueur, et l'on voit sa traversée.
  const clock = { t: T0 };
  const A = new Session('J0');
  Object.assign(A, { now: () => clock.t, start() {}, meet() {}, me: 'p0', status: 'playing' });
  A.state = { gid: `s${gid}`, key: 'k', players: {}, log: [] };
  A.addPlayer(A.me, A.name, 'x'.repeat(64));
  A.chooseRace('human');
  A.claimPlanet(A.planets.find((w) => w.kind === 'planet').id);
  // De part et d'autre du soleil, à travers lui : trajet direct, sans détour.
  const y = sun.y + 1;
  const f = { ships: { fighter: 1 }, cargo: {}, fuel: 1000, from: { x: 0, y }, to: { x: 0, y }, depart: T0, arrive: T0 };
  Object.assign(f, { id: 'sun', origin: 'home', order: null, stance: 'passive' }); // ce qu'a une flotte du jeu
  (A.state.players[A.me].fleets ||= []).push(f);
  film.look(A, 'un chasseur de A à l’ouest du soleil', [{ fleet: [A, 'sun'], visible: true }]);
  assert.equal(fleet.moveTo(f, 'human', {}, { x: 19, y }, null, T0), null);
  clock.t = (f.depart + f.arrive) / 2;
  film.look(A, 'à mi-chemin : il traverse le soleil en ligne droite', [{ fleet: [A, 'sun'], visible: true }]);
  clock.t = f.arrive;
  film.look(A, 'arrivé à l’est, sans détour', [{ fleet: [A, 'sun'], visible: true }]);
  assert.deepEqual(f.to, { x: 19, y });
  assert.equal(f.arrive - T0, fleet.tripMs({ x: 0, y }, { x: 19, y }, fleet.fleetSpeed('human', f.ships, {})));
  close(f.arrive - T0, ((19 / SHIPS.human.fighter.speed) * MIN) / game.TEMPO, 1); // vitesse en cases par heure de jeu (D-083)
});

scenario('D-056 : les petits corps ne servent pas de départ', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  me.home = null;
  me.planet = null;
  film.look(A, 'A n’a plus de planète mère');
  const rock = A.claimPlanet('a0');
  const comet = A.claimPlanet('c0');
  assert.equal(rock, false);
  assert.equal(comet, false);
  const at = (id) => A.planets.find((w) => w.id === id);
  film.look(A, 'A tente l’astéroïde a0 puis la comète c0 : refusé, toujours sans planète', [
    { show: 'départ sur l’astéroïde', at: at('a0'), expected: false, got: rock },
    { show: 'départ sur la comète', at: at('c0'), expected: false, got: comet },
    { show: 'planète mère', expected: 'aucune', got: me.home ? 'une' : 'aucune' },
  ]);
  assert.equal(me.home, null);
});

scenario('D-056 : un astéroïde se colonise', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const target = A.planets.find((w) => w.kind === 'asteroid');
  const cell = { x: target.x, y: target.y };
  const pl = A.state.players[A.me].planet;
  Object.assign(pl, { ships: { colony: 1 }, stock: { ...pl.stock, energy: 900 } });
  const id = A.takeOff('home', { colony: 1 }, {}, 50);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell } });
  film.look(A, 'un vaisseau colonial de A posé sur l’astéroïde');
  A.moveFleet(id, cell, 'colonize');
  film.look(A, 'A donne l’ordre de coloniser');
  clock.t += 1000;
  A.tick();
  film.look(A, '1 s plus tard : colonie fondée sur l’astéroïde', [{ show: 'colonie', at: cell, expected: true, got: !!A.state.players[A.me].colonies?.[target.id] }]);
  assert.ok(A.state.players[A.me].colonies?.[target.id], 'colonie fondée sur l’astéroïde');
});

scenario('D-058 : planètes 14–22 places, astéroïdes 7–10, comètes 6–8 avec des minéraux', (film) => {
  // L'image montre la carte (planètes, astéroïdes et comètes) et la fiche de la planète mère de
  // A, avec ses places ; les bornes de toutes les planètes sont vérifiées par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'la carte : planètes, astéroïdes et comètes ; A touche sa planète mère', mine({ ...A.state.players[A.me].home }));
  assert.deepEqual(game.PLANET_PLACES, [14, 22]);
  assert.deepEqual(game.SMALL_BODIES.asteroid.places, [7, 10]);
  assert.deepEqual(game.SMALL_BODIES.comet.places, [6, 8]);
  assert.ok(game.SMALL_BODIES.comet.share.minerals > 0);
  for (const w of game.planetsFor('gtest').filter((x) => x.kind === 'comet')) assert.ok(w.nature.minerals.max > 0);
});

scenario('D-058 : tirage uniforme des places (les bornes sortent aussi souvent que le reste)', (film) => {
  // Le tirage porte sur 600 cartes : aucun écran ne le montre. L'image montre une partie et la
  // fiche de la planète mère de A (ses places sont l'un de ces tirages) ; l'uniformité est
  // vérifiée par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'A touche sa planète mère : son nombre de places est l’un des tirages', mine({ ...A.state.players[A.me].home }));
  const seen = {};
  for (let i = 0; i < 600; i++) for (const w of game.planetsFor(`u${i}`)) if (w.kind === 'planet') seen[w.places] = (seen[w.places] || 0) + 1;
  const counts = Object.values(seen);
  assert.equal(counts.length, 9, 'de 14 à 22');
  // 600 × 14 tirages, ≈ 933 par valeur : un tirage arrondi donnerait ≈ 470 aux bornes.
  assert.ok(Math.min(...counts) / Math.max(...counts) > 0.8, JSON.stringify(seen));
});

scenario('D-060 : entrepôts hors du score, mine humaine 36, impôt 0,4 par habitant', (film) => {
  // L'image montre la planète d'un humain avec une mine niv. 1 et 100 habitants, dont la fiche
  // donne la production vérifiée ; le score est vérifié par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  const me = A.state.players[A.me];
  Object.assign(me.planet, { levels: { ...me.planet.levels, mine: 1 }, pop: 100 });
  film.look(A, 'humain, mine niv. 1 et 100 habitants : sa production de minéraux', mine({ ...me.home }));
  assert.equal(game.score('human', { mine: 2, store: 6 }), game.score('human', { mine: 2 }));
  assert.ok(game.score('human', { mine: 2 }) > 0);
  const r = game.RACES.human.rates({ mine: 1 }, 100);
  close(r.minerals(1), 36 * 1.1);
  close(r.mineralsBase, 10 + 0.4 * 100);
});

scenario('D-060 : climat adouci (énergie ×0,8–×1,2, minéraux ×0,9–×1,1, nourriture ×0,6–×1,3)', (film) => {
  // L'image montre la carte (soleil au centre) et la fiche de la planète mère de A, dont le climat
  // vient de sa distance au soleil ; les bornes, case par case, sont vérifiées par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'A touche sa planète mère : son climat, selon sa distance au soleil', mine({ ...A.state.players[A.me].home }));
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

scenario('D-060 : pouvoirs aliens (arrachement 40, transe 25 par psionique), transe refusée sur sol vide', (film) => {
  const p = onWorld('alien');
  p.pop = 2;
  const { A, home } = playing(p);
  film.look(A, 'alien avec 2 psioniques', mine(home));
  assert.equal(game.liftGain(p, 1), 80);
  assert.equal(game.powerCost(p, 'trance', 3).energy, 75);
  p.stock.energy = 500;
  p.reserve.minerals = 0;
  p.nature.minerals.regen = 0;
  const before = clone(p);
  film.look(A, 'sol vide et sans repousse, 500 d’énergie', mine(home));
  assert.ok(game.usePower(p, 'trance', T0).error, 'sol vide : refusée');
  film.look(A, 'transe refusée : rien payé, pas de transe', mine(home));
  assert.equal(p.stock.energy, before.stock.energy, 'rien payé');
  assert.equal(p.trance, undefined);
});

scenario('D-070 : « Nourriture » dans les stocks du joueur', (film) => {
  // La fiche de la planète mère montre les stocks, dont la nourriture ; le nom est vérifié par l'assert.
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'A touche sa planète mère : ses stocks, dont « Nourriture »', mine({ ...A.state.players[A.me].home }));
  assert.equal(game.RES_INFO.food.name, 'Nourriture');
});

scenario('D-074 : seuls les aliens ont des pouvoirs', (film) => {
  for (const r of ['human', 'machine']) {
    const p = onWorld(r);
    p.stock.energy = 500;
    const { A, home } = playing(p);
    assert.ok(game.usePower(p, 'lift', T0).error, r);
    film.look(A, `${r} : l’arrachement est refusé, rien n’a changé`, mine(home));
  }
});

scenario('D-099 : chez les humains, l’Agronomie et les Arches coloniales coûtent aussi de la nourriture', (film) => {
  assert.deepEqual(TECHS.human.agro.base, { minerals: 120, food: 40 });
  assert.deepEqual(TECHS.human.colonies.base, { minerals: 400, food: 120 });
  for (const k of ['forage', 'propulsion', 'blindage', 'armement', 'radar']) {
    assert.equal(TECHS.human[k].base.food, undefined, `${k} sans nourriture`);
  }
  const p = game.newPlanet('human', T0);
  p.levels.lab = 1;
  p.stock.minerals = 900;
  p.stock.food = 0;
  const { A, home } = playing(p);
  film.look(A, 'humain avec labo, 900 minéraux et aucune nourriture', mine(home));
  assert.match(game.startResearch(p, 'agro', T0), /insuffisantes/);
  p.stock.food = 100;
  assert.equal(game.startResearch(p, 'agro', T0), null);
  film.look(A, 'avec 100 de nourriture : Agronomie lancée, 40 de nourriture payés', mine(home));
  close(p.stock.food, 60);
});
