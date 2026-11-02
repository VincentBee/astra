// Décisions du domaine flottes / voyage / carburant / combat / échanges /
// anti-triche (docs/decisions.md). Chaque test porte le numéro de la décision
// qu'il protège ; il vérifie ce que dit la doc, pas ce que fait le code.
//
// Les tests qui jouent une partie sont écrits en scénarios (D-129) : en cas d'échec, le
// rapport tests/reports/decisions-flotte.test.html montre la carte, image par image.
import assert from 'node:assert/strict';
import { newGame, game, fleet, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

// Après le harness : les globals du navigateur sont déjà en place.
const { normalize, ORDER_KINDS, Session } = await import('../js/session.js');
const { SHIPS, TECHS, sightRange } = await import('../js/tech.js');
const { OFFER_MS, ABANDON_MS, TRADE_RES } = await import('../js/trade.js');
const scenario = scenarios(import.meta.url);

const P = (s) => s.state.players[s.me];

/** Une flotte de `s`, arrêtée en `at`, avec `fuel` de carburant. */
function park(s, ships, cargo, at, fuel) {
  const pl = P(s).planet;
  pl.ships = { ...ships };
  pl.stock = { ...pl.stock, minerals: 5000, energy: 5000 };
  pl.levels.store = 3;
  const id = s.takeOff('home', ships, cargo, 0);
  Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel });
  s.touch();
  return id;
}

/** Le tricheur `b` envoie à `a` sa copie, retouchée par `edit`. */
function forge(a, b, edit) {
  const st = clone(b.snapshot());
  edit(st);
  a.mergeIn(st, { pid: b.me });
}

/** Avance l'horloge seconde par seconde en faisant passer `players` ; `each(i)` après chaque seconde (images). */
function run(clock, players, seconds, each = () => {}) {
  for (let i = 0; i < seconds; i++) {
    clock.t += 1000;
    for (const s of players) s.tick();
    each(i);
  }
}

// ----- D-017 : plus de déplacement aux flèches -------------------------------

scenario('D-017 : une fiche d’avant garde sa position aux flèches, elle disparaît', (film) => {
  const { players: [A, B] } = newGame(2);
  film.look(A, 'partie à deux');
  forge(A, B, (st) => Object.assign(st.players[B.me], { pos: { x: 3, y: 3 }, actAt: st.players[B.me].actAt + 1000 }));
  film.look(A, 'A reçoit de B une fiche d’avant, avec une position aux flèches : elle disparaît', [
    { show: 'position aux flèches de B', at: A.state.players[B.me].home, expected: undefined, got: A.state.players[B.me].pos },
  ]);
  assert.equal(A.state.players[B.me].pos, undefined);
  assert.equal(normalize({ pos: { x: 1, y: 1 } }).pos, undefined);
});

// ----- D-020 : coloniser, transporter, combattre -----------------------------

scenario('D-020 : transport — une flotte chargée qui se pose sur une autre de mes planètes y dépose sa cargaison', (film) => {
  const { players: [A], clock } = newGame(2, ['human', 'human']);
  const w = A.planets[5];
  const cell = { x: w.x, y: w.y };
  const cid = park(A, { colony: 1 }, {}, cell, 100);
  film.look(A, `un vaisseau colonie de A sur ${w.name}`);
  A.moveFleet(cid, cell, 'colonize');
  run(clock, [A], 1);
  film.look(A, `A colonise ${w.name}`);
  const colony = P(A).colonies[w.id];
  assert.ok(colony, 'colonie fondée');
  // Un cargo part de la planète mère, plein de minéraux, et se pose sur la colonie.
  const id = park(A, { cargo: 1 }, { minerals: 300 }, { x: cell.x + 1, y: cell.y }, 40);
  film.look(A, 'un cargo de A, 300 minéraux en soute, à une case de la colonie');
  assert.ok(A.moveFleet(id, cell, 'dock'));
  const arrive = A.myFleet(id).arrive;
  const before = clone(colony);
  film.roll(A, clock, arrive, 'le cargo va se poser sur la colonie');
  A.tick();
  const expected = game.stateAt(before, arrive).stock.minerals + 300;
  const got = P(A).colonies[w.id].stock.minerals;
  film.look(A, 'le cargo s’est posé : la colonie a reçu les minéraux (sa production + 300)', [
    { show: 'minéraux de la colonie', at: cell, expected, got, ok: Math.abs(got - expected) < 1 },
  ]);
  assert.equal(A.myFleet(id), null, 'la flotte s’est posée');
  assert.ok(Math.abs(P(A).colonies[w.id].stock.minerals - expected) < 1, `${P(A).colonies[w.id].stock.minerals} ≠ ${expected}`);
});

// ----- D-022 : le téléphone de l'attaquant calcule ---------------------------

scenario('D-022 : le défenseur n’applique ses pertes qu’en lisant le rapport de l’attaquant', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { ships: { fighter: 4 } });
  B.touch();
  sync(A, B);
  const cell = { ...P(B).home };
  const id = park(A, { fighter: 20 }, {}, cell, 400);
  film.look(A, '20 chasseurs de A sur la planète de B, qui en a 4 à quai');
  assert.ok(A.moveFleet(id, cell, 'attack'));
  clock.t += 1000;
  A.tick();
  film.look(A, 'A attaque et écrit le rapport du combat', [{ show: 'rapports écrits par A', at: cell, expected: 1, got: P(A).effects.length }]);
  assert.equal(P(A).effects.length, 1, 'A a écrit le rapport du combat');
  film.look(B, 'B n’a pas encore lu le rapport', [{ show: 'chasseurs de B à quai', at: cell, expected: 4, got: P(B).planet.ships.fighter }]);
  assert.equal(P(B).planet.ships.fighter, 4, 'B n’a encore rien perdu');
  sync(B, A);
  B.tick();
  film.look(B, 'B lit le rapport de A et applique ses pertes', [{ show: 'chasseurs de B à quai', at: cell, expected: 0, got: P(B).planet.ships.fighter || 0 }]);
  assert.equal(P(B).planet.ships.fighter || 0, 0, 'B applique les pertes calculées par A');
});

// ----- D-026 : une seule carte -------------------------------------------------

scenario('D-026 : les flottes voyagent sur la carte unique, pas au-delà', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 10, y: 10 }, 80);
  film.look(A, 'une flotte de A en [10:10]');
  const out = [{ x: game.UNIVERSE.w, y: 10 }, { x: -1, y: 10 }, { x: 10, y: game.UNIVERSE.h }].map((to) => A.moveFleet(id, to, 'move'));
  assert.equal(out[0], false);
  assert.equal(out[1], false);
  assert.equal(out[2], false);
  film.look(A, 'refusé : hors de la carte (à droite, à gauche, en bas)', [{ show: 'départs hors de la carte acceptés', at: [A, id], expected: [false, false, false], got: out }]);
  const edge = A.moveFleet(id, { x: game.UNIVERSE.w - 1, y: 10 }, 'move');
  assert.equal(edge, true);
  film.look(A, 'accepté : vers le bord droit de la carte', [{ show: 'départ vers le bord accepté', at: [A, id], expected: true, got: edge }]);
});

// ----- D-027 / D-032 : le voyage coûte du carburant, le carburant est de l'énergie

scenario('D-027 : chaque case parcourue brûle du carburant', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 80);
  film.look(A, '2 chasseurs de A en [5:5], 80 de carburant');
  assert.ok(A.moveFleet(id, { x: 8, y: 5 }, 'move'));
  film.roll(A, clock, A.myFleet(id).arrive + 1000, 'en route vers [8:5]');
  // 2 frégates × 1 par case × 3 cases.
  film.look(A, 'arrivée en [8:5], 3 cases parcourues : 2 × 3 = 6 de carburant brûlés', [{ show: 'carburant', at: [A, id], expected: 80 - 6, got: fleet.fuelAt(A.myFleet(id), 'human', clock.t) }]);
  assert.equal(fleet.fuelAt(A.myFleet(id), 'human', clock.t), 80 - 6);
});

scenario('D-032 : le carburant est pris dans l’énergie de la planète, et y retourne en se posant', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const pl = P(A).planet;
  Object.assign(pl, { ships: { fighter: 2 }, stock: { ...pl.stock, energy: 500 } });
  pl.levels.store = 3;
  const e0 = game.stateAt(pl, clock.t).stock.energy;
  film.look(A, '2 chasseurs à quai, 500 d’énergie');
  const id = A.takeOff('home', { fighter: 2 }, {}, 30);
  const energy = () => game.stateAt(P(A).planet, clock.t).stock.energy;
  film.look(A, 'décollage avec 30 de carburant : pris dans l’énergie de la planète', [
    { show: 'énergie de la planète', at: P(A).home, expected: e0 - 30, got: energy(), ok: Math.abs(energy() - (e0 - 30)) < 1e-6 },
    { show: 'carburant', at: [A, id], expected: 30, got: fleet.fuelAt(A.myFleet(id), 'human', clock.t) },
  ]);
  assert.ok(id);
  assert.ok(Math.abs(P(A).planet.stock.energy - (e0 - 30)) < 1e-6, 'le plein coûte 30 d’énergie');
  assert.ok(A.moveFleet(id, { ...P(A).home }, 'dock'));
  A.tick();
  film.look(A, 'la flotte se repose : son carburant retourne au stock', [{ show: 'énergie de la planète', at: P(A).home, expected: e0, got: energy(), ok: Math.abs(energy() - e0) < 1 }]);
  assert.equal(A.myFleet(id), null);
  assert.ok(Math.abs(game.stateAt(P(A).planet, clock.t).stock.energy - e0) < 1, 'le carburant non brûlé revient au stock');
});

scenario('D-032 : on peut scinder une flotte en deux', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const id = park(A, { fighter: 5 }, {}, { x: 5, y: 5 }, 100);
  film.look(A, '5 chasseurs de A en [5:5]');
  const other = A.splitFleet(id, { ships: { fighter: 2 }, fuel: 40 });
  film.look(A, 'scindée : 3 chasseurs d’un côté, 2 de l’autre (avec 40 de carburant)', [
    { show: 'vaisseaux', at: [A, id], expected: { fighter: 3 }, got: A.myFleet(id).ships },
    { show: 'nouvelle flotte', at: [A, other], expected: { fighter: 2, fuel: 40 }, got: { ...A.myFleet(other).ships, fuel: A.myFleet(other).fuel } },
  ]);
  assert.ok(other);
  assert.deepEqual(A.myFleet(id).ships, { fighter: 3 });
  assert.deepEqual(A.myFleet(other).ships, { fighter: 2 });
  assert.equal(A.myFleet(other).fuel, 40);
});

// ----- D-028 : pilotage comme dans un jeu de stratégie en temps réel -----------

scenario('D-028 : changement de cap en route, arrêt, rappel et stationnement', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 2, y: 5 }, 80);
  film.look(A, 'une flotte de A en [2:5]');
  assert.ok(A.moveFleet(id, { x: 12, y: 5 }, 'move'));
  clock.t += 40_000 / game.TEMPO; // trajets TEMPO fois plus courts (D-083)
  const here = fleet.fleetPos(A.myFleet(id), clock.t);
  film.look(A, 'en route vers [12:5]', [{ show: 'position x', at: [A, id], expected: 'entre 3 et 11', got: here.x, ok: here.x > 3 && here.x < 11 }]);
  assert.ok(here.x > 3 && here.x < 11, 'en route');
  // Changement de cap : le nouveau trajet part de là où elle est.
  assert.ok(A.moveFleet(id, { x: 6, y: 9 }, 'move'));
  const f = A.myFleet(id);
  const xy = (p) => `${p.x.toFixed(1)}:${p.y.toFixed(1)}`;
  film.look(A, 'changement de cap vers [6:9] : le trajet part de là où elle est', [{ show: 'repart de', at: [A, id], expected: xy(here), got: xy(f.from) }]);
  assert.ok(Math.abs(f.from.x - here.x) < 1e-6 && Math.abs(f.from.y - here.y) < 1e-6, 'repart de sa position');
  assert.equal(f.depart, clock.t);
  // Arrêt : elle finit sur la case entière la plus proche.
  clock.t += 3000;
  assert.ok(A.stopFleet(id));
  const to = A.myFleet(id).to;
  film.look(A, 'arrêt sur la case la plus proche', [{ show: 'arrêt en', at: [A, id], expected: 'une case entière', got: `${to.x}:${to.y}`, ok: Number.isInteger(to.x) && Number.isInteger(to.y) }]);
  assert.ok(Number.isInteger(A.myFleet(id).to.x) && Number.isInteger(A.myFleet(id).to.y));
  // Stationnement : arrêtée sans ordre, elle reste sur la carte.
  run(clock, [A], 30, (i) => i % 10 === 9 && film.look(A, `stationnée depuis ${i + 1} s`, [{ show: 'en mouvement', at: [A, id], expected: false, got: fleet.moving(A.myFleet(id), clock.t) }]));
  assert.ok(A.myFleet(id), 'la flotte attend sur place');
  assert.equal(fleet.moving(A.myFleet(id), clock.t), false);
  // Rappel : elle rentre se poser chez elle.
  assert.ok(A.returnFleet(id));
  film.look(A, 'rappel : elle rentre se poser chez elle', [{ show: 'ordre', at: [A, id], expected: 'dock home', got: `${A.myFleet(id).order.kind} ${A.myFleet(id).order.key}` }]);
  assert.deepEqual(A.myFleet(id).order, { kind: 'dock', key: 'home' });
});

// ----- D-029 : interception en route -------------------------------------------

scenario('D-029 : le point d’interception est sur le trajet de la cible, avant son arrivée', (film) => {
  // Dans une partie : le cargo de B part de [2:5] vers [19:5], le chasseur de A attend en [3:7].
  // Les images montrent la scène ; le calcul du point est vérifié sur les mêmes trajets, à plat.
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, {}, { x: 2, y: 5 }, 40);
  assert.ok(B.moveFleet(bid, { x: 19, y: 5 }, 'move'));
  park(A, { fighter: 1 }, {}, { x: 3, y: 7 }, 40);
  sync(A, B);
  film.look(A, 'le cargo de B part de [2:5] vers [19:5] ; le chasseur de A attend en [3:7]');
  const t0 = 1_000_000;
  const target = { ships: { cargo: 1 }, from: { x: 2, y: 5 }, to: { x: 19, y: 5 }, depart: t0, arrive: t0 + 17 * 12_000 };
  const chaser = { ships: { fighter: 1 }, from: { x: 3, y: 7 }, to: { x: 3, y: 7 }, depart: t0, arrive: t0 };
  const p = fleet.intercept(chaser, 'human', {}, target, t0);
  film.look(A, 'le point d’interception calculé : sur la ligne y = 5, entre le départ et l’arrivée du cargo', [
    { show: 'interception', at: p, expected: 'sur [2→19 : 5]', got: `${p.x.toFixed(1)}:${p.y.toFixed(1)}`, ok: p.y === 5 && p.x > 2 && p.x < 19 },
  ]);
  assert.equal(p.y, 5);
  assert.ok(p.x > 2 && p.x < 19, `point d’interception ${p.x} pas en route`);
});

scenario('D-029 : une flotte en route est rattrapée et combattue avant d’arriver', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 2 }, {}, { x: 3, y: 5 }, 80);
  assert.ok(B.moveFleet(bid, { x: 19, y: 5 }, 'move'));
  const arrive = B.myFleet(bid).arrive;
  const aid = park(A, { fighter: 5 }, {}, { x: 4, y: 6 }, 200);
  sync(A, B);
  film.look(A, '2 cargos de B en route vers [19:5], 5 chasseurs de A à côté');
  assert.ok(A.chaseFleet(aid, B.me, bid));
  film.look(A, 'A prend les cargos de B en chasse');
  run(clock, [A], 120, (i) => i % 10 === 9 && film.look(A, `poursuite, après ${i + 1} s`));
  const e = P(A).effects.find((x) => x.fleet === bid);
  film.look(A, 'le combat a eu lieu pendant le trajet des cargos', [
    { show: 'combat', expected: 'avant l’arrivée', got: e ? `${Math.round((arrive - e.at) / 1000)} s avant l’arrivée` : 'aucun combat', ok: !!e && e.at < arrive },
  ]);
  assert.ok(e, 'combat livré');
  assert.ok(e.at < arrive, 'pendant le trajet de la cible');
});

// ----- D-030 : ordres, réservoir, rencontre, vision ------------------------------

scenario('D-030 : un seul réservoir par flotte, la somme de ceux de ses vaisseaux', (film) => {
  // L'image montre une flotte de 2 chasseurs et 1 lourd, au plein ; les sommes sont vérifiées par les asserts.
  const { players: [A] } = newGame(1, ['human']);
  const id = park(A, { fighter: 2, heavy: 1 }, {}, { x: 5, y: 5 }, fleet.fleetTank('human', { fighter: 2, heavy: 1 }));
  film.look(A, 'une flotte de A : 2 chasseurs et 1 lourd, un seul réservoir plein', [
    { show: 'réservoir', at: [A, id], expected: 2 * SHIPS.human.fighter.tank + SHIPS.human.heavy.tank, got: fleet.fleetTank('human', { fighter: 2, heavy: 1 }) },
    { show: 'brûle par case', at: [A, id], expected: 2 * SHIPS.human.fighter.burn + SHIPS.human.heavy.burn, got: fleet.fleetBurn('human', { fighter: 2, heavy: 1 }) },
  ]);
  assert.equal(fleet.fleetTank('human', { fighter: 2, heavy: 1 }), 2 * SHIPS.human.fighter.tank + SHIPS.human.heavy.tank);
  assert.equal(fleet.fleetBurn('human', { fighter: 2, heavy: 1 }), 2 * SHIPS.human.fighter.burn + SHIPS.human.heavy.burn);
});

scenario('D-030 : deux flottes ennemies qui se rencontrent ne combattent pas toutes seules, elles peuvent échanger', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const cell = { x: 5, y: 5 };
  const aid = park(A, { fighter: 5 }, {}, cell, 100);
  const bid = park(B, { fighter: 5 }, {}, cell, 100);
  for (let i = 0; i < 10; i++) {
    sync(A, B);
    sync(B, A);
    if (i === 0) film.look(A, '5 chasseurs de A et 5 de B sur la même case');
    run(clock, [A, B], 1);
    const last = i === 9 && [
      { show: 'combats', expected: 0, got: (P(A).effects || []).length + (P(B).effects || []).length },
      { show: 'vaisseaux', at: [A, aid], expected: { fighter: 5 }, got: A.myFleet(aid).ships },
      { show: 'échange possible avec B', at: [B, bid], expected: true, got: A.tradePartners({ fleet: aid }).some((t) => t.pid === B.me && t.ref.fleet === bid) },
    ];
    if (i % 3 === 2 || i === 9) film.look(A, `côte à côte depuis ${i + 1} s${last ? ' : pas de combat, un échange est possible' : ''}`, last || []);
  }
  assert.equal((P(A).effects || []).length + (P(B).effects || []).length, 0, 'aucun combat automatique');
  assert.deepEqual(A.myFleet(aid).ships, { fighter: 5 });
  assert.deepEqual(B.myFleet(bid).ships, { fighter: 5 });
  assert.ok(A.tradePartners({ fleet: aid }).some((t) => t.pid === B.me && t.ref.fleet === bid), 'échange proposé');
});

scenario('D-030 : la portée de détection s’améliore avec la recherche', (film) => {
  for (const race of ['human', 'machine', 'alien']) {
    const key = Object.keys(TECHS[race]).find((k) => TECHS[race][k].range);
    assert.equal(sightRange(race, { [key]: 2 }, 'fleet'), sightRange(race, {}, 'fleet') + 2, race);
  }
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, {}, { x: 5, y: 10 }, 40);
  const aid = park(A, { fighter: 2 }, {}, { x: 8, y: 10 }, 80);
  sync(A, B);
  const blind = A.chaseFleet(aid, B.me, bid);
  film.look(A, 'un cargo de B à 3 cases de la flotte de A, sans radar : hors de portée', [{ show: 'prise en chasse', at: [A, aid], expected: false, got: blind }]);
  assert.equal(blind, false, 'hors de portée à 3 cases');
  P(A).planet.tech = { ...P(A).planet.tech, radar: 1 };
  const seen = A.chaseFleet(aid, B.me, bid);
  film.look(A, 'A a le radar : le cargo est à portée, la chasse part', [{ show: 'prise en chasse', at: [A, aid], expected: true, got: seen }]);
  assert.equal(seen, true, 'visible avec le radar');
});

// ----- D-031 : échange, plein, panne, détection ---------------------------------

/** A et B ont chacun une flotte arrêtée sur la même case. */
function meeting() {
  const g = newGame(2, ['human', 'human']);
  const [A, B] = g.players;
  const cell = { x: 5, y: 5 };
  const aid = park(A, { cargo: 1 }, { minerals: 200 }, cell, 20);
  const bid = park(B, { cargo: 1 }, {}, cell, 40);
  g.sync(A, B);
  g.sync(B, A);
  return { ...g, A, B, aid, bid, cell };
}

scenario('D-031 : un échange se fait par proposition puis accord', (film) => {
  const { A, B, aid, bid, clock, sync } = meeting();
  film.look(A, 'un cargo de A (200 minéraux) et un de B sur la même case');
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 100 }, { fuel: 10 });
  film.look(A, 'A propose 100 minéraux contre 10 de carburant : ses 100 minéraux partent sous séquestre', [
    { show: 'minéraux en soute', at: [A, aid], expected: 100, got: A.myFleet(aid).cargo.minerals },
    { show: 'minéraux en soute', at: [B, bid], expected: 0, got: B.myFleet(bid).cargo.minerals || 0 },
  ]);
  assert.ok(id);
  assert.equal(A.myFleet(aid).cargo.minerals, 100, 'ce que A donne part sous séquestre');
  assert.equal(B.myFleet(bid).cargo.minerals || 0, 0, 'rien chez B avant son accord');
  sync(B, A);
  clock.t += 1000;
  assert.ok(B.answerTrade(A.me, id, true));
  film.look(B, 'B accepte : il reçoit les minéraux et donne 10 de carburant', [
    { show: 'soute', at: [B, bid], expected: { minerals: 100, fuel: 30 }, got: { minerals: B.myFleet(bid).cargo.minerals, fuel: Math.round(fleet.fuelAt(B.myFleet(bid), 'human', clock.t)) } },
  ]);
  assert.equal(B.myFleet(bid).cargo.minerals, 100);
  assert.equal(Math.round(fleet.fuelAt(B.myFleet(bid), 'human', clock.t)), 30);
  sync(A, B);
  A.tick();
  film.look(A, 'A lit la réponse de B et reçoit le carburant', [{ show: 'carburant', at: [A, aid], expected: 30, got: Math.round(fleet.fuelAt(A.myFleet(aid), 'human', clock.t)) }]);
  assert.equal(Math.round(fleet.fuelAt(A.myFleet(aid), 'human', clock.t)), 30, 'A reçoit le carburant demandé');
});

scenario('D-031 : le plein se fait sur ses planètes, pas sur celle d’un autre', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  sync(A, B);
  const there = park(A, { fighter: 2 }, {}, { ...P(B).home }, 0);
  const away = A.refuelFleet(there);
  film.look(A, 'une flotte de A à sec sur la planète de B : pas de plein', [{ show: 'plein fait', at: [A, there], expected: false, got: away }]);
  assert.equal(away, false);
  const home = park(A, { fighter: 2 }, {}, { ...P(A).home }, 0);
  const own = A.refuelFleet(home);
  film.look(A, 'une autre flotte de A à sec sur sa planète mère : le plein est fait', [{ show: 'plein fait', at: [A, home], expected: true, got: own }]);
  assert.equal(own, true);
});

scenario('D-031 : deux de mes flottes sur la même case se passent du carburant et fusionnent, pas à distance', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const a = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 80);
  const b = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 10);
  const far = park(A, { fighter: 2 }, {}, { x: 9, y: 5 }, 10);
  film.look(A, 'deux flottes de A en [5:5], une troisième en [9:5]');
  const distant = A.transferFleet(a, far, { fuel: 10 });
  assert.equal(distant, false, 'pas à distance');
  assert.ok(A.transferFleet(a, b, { fuel: 30 }));
  film.look(A, '30 de carburant passent d’une flotte à l’autre en [5:5] ; pas vers celle de [9:5]', [
    { show: 'reçu à distance', at: [A, far], expected: false, got: distant },
    { show: 'carburant', at: [A, b], expected: 40, got: fleet.fuelAt(A.myFleet(b), 'human', clock.t) },
  ]);
  assert.equal(fleet.fuelAt(A.myFleet(b), 'human', clock.t), 40);
  assert.ok(A.mergeFleets(a, b));
  film.look(A, 'les deux flottes de [5:5] fusionnent', [
    { show: 'flotte fusionnée', at: [A, b], expected: { fighter: 4, fuel: 90 }, got: { ...A.myFleet(b).ships, fuel: fleet.fuelAt(A.myFleet(b), 'human', clock.t) } },
  ]);
  assert.equal(A.myFleet(a), null);
  assert.deepEqual(A.myFleet(b).ships, { fighter: 4 });
  assert.equal(fleet.fuelAt(A.myFleet(b), 'human', clock.t), 90);
});

scenario('D-031 : une flotte à sec reste bloquée jusqu’à ce qu’on la secoure', (film) => {
  const { A, B, aid, bid, clock, sync } = meeting();
  Object.assign(A.myFleet(aid), { fuel: 0, stranded: true });
  A.touch();
  const stuck = A.moveFleet(aid, { x: 6, y: 5 }, 'move');
  film.look(A, 'le cargo de A est à sec, celui de B est à côté : il ne peut pas partir', [{ show: 'départ accepté', at: [A, aid], expected: false, got: stuck }]);
  assert.equal(stuck, false, 'à sec, elle ne bouge pas');
  sync(B, A);
  // Secours : B lui donne du carburant par un échange.
  const id = B.proposeTrade({ fleet: bid }, { pid: A.me, fleet: aid }, { fuel: 20 }, {});
  film.look(B, 'B propose 20 de carburant à A');
  assert.ok(id);
  sync(A, B);
  clock.t += 1000;
  assert.ok(A.answerTrade(B.me, id, true));
  const freed = A.moveFleet(aid, { x: 6, y: 5 }, 'move');
  assert.equal(freed, true, 'ravitaillée, elle repart');
  film.look(A, 'A accepte : ravitaillée, sa flotte repart vers [6:5]', [{ show: 'départ accepté', at: [A, aid], expected: true, got: freed }]);
});

scenario('D-031 : une technologie de détection par race', (film) => {
  // Une partie à trois races : chaque joueur voit sa portée de détection (halo) ; le compte des technologies est vérifié par les asserts.
  const { players } = newGame(3, ['human', 'machine', 'alien']);
  const count = (race) => Object.values(TECHS[race]).filter((t) => t.range).length;
  for (const s of players) film.look(s, `le joueur ${P(s).race} et sa portée de détection`, [{ show: `technologies de détection (${P(s).race})`, expected: 1, got: count(P(s).race) }]);
  for (const race of ['human', 'machine', 'alien']) {
    assert.equal(Object.values(TECHS[race]).filter((t) => t.range).length, 1, race);
  }
});

// ----- D-034 : offre de 5 min, non annulable --------------------------------------

scenario('D-034 : une offre vaut 5 min', (film) => {
  const { A, B, aid, bid } = meeting();
  film.look(A, 'un cargo de A et un de B sur la même case');
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
  const o = P(A).offers.find((x) => x.id === id);
  film.look(A, 'A propose 50 minéraux à B : l’offre vaut 5 min', [{ show: 'durée de l’offre', at: [A, aid], expected: '5 min', got: `${(o.expires - o.at) / 60_000} min` }]);
  assert.equal(o.expires - o.at, 5 * 60_000);
  assert.equal(OFFER_MS, 5 * 60_000);
});

scenario('D-034 : acceptée juste avant 5 min elle vaut, juste après elle est refusée', (film) => {
  for (const [delay, ok] of [[5 * 60_000 - 1000, true], [5 * 60_000 + 1000, false]]) {
    const { A, B, aid, bid, clock, sync } = meeting();
    const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
    sync(B, A);
    film.look(B, 'A propose 50 minéraux à B');
    clock.t += delay;
    const done = B.answerTrade(A.me, id, true);
    film.look(B, `B répond ${delay / 1000} s après l’offre`, [{ show: 'accord accepté', at: [B, bid], expected: ok, got: done }]);
    assert.equal(done, ok, `à ${delay} ms`);
  }
});

scenario('D-034 : une offre ne s’annule pas, et la flotte qui propose attend la réponse', (film) => {
  const { A, B, aid, bid } = meeting();
  film.look(A, 'un cargo de A et un de B sur la même case');
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
  const moved = A.moveFleet(aid, { x: 6, y: 5 }, 'move');
  const split = A.splitFleet(aid, { ships: { cargo: 1 } });
  film.look(A, 'A propose 50 minéraux : son cargo attend la réponse, bloqué', [
    { show: 'ordre pour annuler', expected: false, got: ORDER_KINDS.some((k) => /cancel|annul/i.test(k)) },
    { show: 'départ accepté', at: [A, aid], expected: false, got: moved },
    { show: 'scission acceptée', at: [A, aid], expected: false, got: split },
  ]);
  assert.ok(id);
  assert.ok(!ORDER_KINDS.some((k) => /cancel|annul/i.test(k)), 'aucun ordre pour annuler');
  assert.ok(!Object.getOwnPropertyNames(Session.prototype).some((k) => /cancel.*(trade|offer)/i.test(k)));
  assert.equal(moved, false, 'bloquée');
  assert.equal(split, false, 'bloquée');
});

// ----- D-036 : limites acceptées du pair à pair -----------------------------------

scenario('D-036 (modifiée par D-095) : une flotte en orbite ne défend pas la planète', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const home = { ...P(B).home };
  const guard = park(B, { fighter: 10 }, {}, home, 100); // en orbite, pas posée
  const bp = P(B).planet;
  // Sans bâtiment : la planète n'a pas de défense propre (D-095), seuls ses vaisseaux posés la défendraient.
  Object.assign(bp, { ships: {}, levels: {}, stock: { ...bp.stock, minerals: 2000 } });
  B.touch();
  sync(A, B);
  const id = park(A, { fighter: 3, cargo: 2 }, {}, home, 200);
  film.look(A, 'A arrive sur la planète de B, gardée par 10 chasseurs de B en orbite');
  assert.ok(A.moveFleet(id, home, 'attack'));
  clock.t += 1000;
  A.tick();
  const e = P(A).effects.at(-1);
  film.look(A, 'A attaque : la planète, sans vaisseau posé, est pillée ; A ne perd rien', [
    { show: 'minéraux pillés', at: home, expected: 'plus de 0', got: e.take.minerals, ok: e.take.minerals > 0 },
    { show: 'vaisseaux', at: [A, id], expected: { fighter: 3, cargo: 2 }, got: A.myFleet(id).ships },
  ]);
  assert.ok(e.take.minerals > 0, 'planète sans vaisseau posé : pillée');
  assert.deepEqual(A.myFleet(id).ships, { fighter: 3, cargo: 2 }, 'aucune perte : personne ne défend');
  sync(B, A);
  B.tick();
  film.look(B, 'B lit le rapport : sa flotte en orbite n’a pas combattu', [{ show: 'vaisseaux', at: [B, guard], expected: { fighter: 10 }, got: B.myFleet(guard).ships }]);
  assert.deepEqual(B.myFleet(guard).ships, { fighter: 10 }, 'la flotte en orbite n’a pas combattu');
});

// ----- D-059 : limites d'affichage défensives ---------------------------------------

scenario('D-059 : noms à 16 caractères et couleurs de joueur filtrées', (film) => {
  const { players: [A, B] } = newGame(2);
  film.look(A, 'partie à deux');
  forge(A, B, (st) => Object.assign(st.players[B.me], { name: 'N'.repeat(40), color: 'red;background:url(x)', actAt: st.players[B.me].actAt + 1000 }));
  const b = A.state.players[B.me];
  film.look(A, 'A reçoit de B un nom de 40 caractères et une couleur piégée : nom coupé, couleur remplacée', [
    { show: 'longueur du nom de B', at: b.home, expected: 16, got: b.name.length },
    { show: 'couleur de B', expected: 'une couleur #rrggbb', got: b.color, ok: /^#[0-9a-f]{6}$/i.test(b.color) },
  ]);
  assert.equal(b.name.length, 16);
  assert.match(b.color, /^#[0-9a-f]{6}$/i);
  assert.notEqual(b.color, 'red;background:url(x)');
  assert.equal(normalize({ name: 'Zoé', color: '#12ab9f' }).color, '#12ab9f', 'une vraie couleur est gardée');
});

// ----- D-061 : anti-triche et tolérance d'horloge -----------------------------------

scenario('D-061 : une horloge en avance est tolérée jusqu’à un jour, pas au-delà', (film) => {
  for (const [ahead, kept] of [[23 * 3_600_000, true], [25 * 3_600_000, false]]) {
    const { players: [A, B], clock } = newGame(2);
    const t = clock.t + ahead;
    forge(A, B, (st) => (st.players[B.me].actAt = t));
    film.look(A, `A reçoit une fiche de B datée de ${ahead / 3_600_000} h dans le futur`, [{ show: 'fiche gardée', at: A.state.players[B.me].home, expected: kept, got: A.state.players[B.me].actAt === t }]);
    assert.equal(A.state.players[B.me].actAt === t, kept, `${ahead / 3_600_000} h d’avance`);
  }
});

scenario('D-061 : un échange accepté à temps mais su très en retard est conclu après coup depuis la planète mère', (film) => {
  const { A, B, aid, bid, clock, sync } = meeting();
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 100 }, { fuel: 20 });
  sync(B, A);
  film.look(A, 'A propose 100 minéraux contre 20 de carburant');
  clock.t += 60_000;
  assert.ok(B.answerTrade(A.me, id, true)); // A n'en sait rien
  film.look(B, 'B accepte après 1 min, A n’en sait rien');
  clock.t += OFFER_MS + ABANDON_MS;
  A.tick();
  film.look(A, 'sans nouvelles, A abandonne l’offre et reprend sa part', [
    { show: 'offres en cours', expected: 0, got: P(A).offers.length },
    { show: 'minéraux en soute', at: [A, aid], expected: 200, got: A.myFleet(aid).cargo.minerals },
  ]);
  assert.equal(P(A).offers.length, 0);
  assert.equal(A.myFleet(aid).cargo.minerals, 200, 'faute de nouvelles, A a repris sa part');
  assert.equal(P(A).dropped.length, 1);
  const before = game.stateAt(P(A).planet, clock.t).stock;
  sync(A, B); // la réponse de B arrive enfin
  A.tick();
  const after = game.stateAt(P(A).planet, clock.t).stock;
  film.look(A, 'la réponse de B arrive enfin : l’échange est conclu depuis la planète mère', [
    { show: 'minéraux rendus', at: P(A).home, expected: 100, got: before.minerals - after.minerals, ok: Math.abs(after.minerals - (before.minerals - 100)) < 1 },
    { show: 'énergie reçue', at: P(A).home, expected: 20, got: after.energy - before.energy, ok: Math.abs(after.energy - (before.energy + 20)) < 1 },
  ]);
  assert.equal(P(A).dropped.length, 0);
  assert.ok(Math.abs(after.minerals - (before.minerals - 100)) < 1, 'A rend ce qu’il avait repris');
  assert.ok(Math.abs(after.energy - (before.energy + 20)) < 1, 'A reçoit ce qu’il demandait');
});

// ----- D-062 : pas d'attaque sans armes, coûts des vaisseaux ------------------------

scenario('D-062 : une flotte sans armes ne peut pas en prendre une autre en chasse', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, { minerals: 300 }, { x: 5, y: 5 }, 40);
  const aid = park(A, { cargo: 5 }, {}, { x: 6, y: 5 }, 40);
  sync(A, B);
  const chase = A.chaseFleet(aid, B.me, bid);
  film.look(A, '5 cargos de A, sans armes, à côté d’un cargo chargé de B : pas de chasse', [{ show: 'prise en chasse', at: [A, aid], expected: false, got: chase }]);
  assert.equal(chase, false);
});

scenario('D-062 : sans armes, pas de victoire, même contre personne', (film) => {
  // Où le joueur le rencontre : 5 cargos, sans armes, et 1 chasseur de A devant la planète de B, vide.
  // Les combats eux-mêmes sont calculés à plat par les asserts.
  const { players: [A, B], sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { ships: {}, levels: {} });
  B.touch();
  sync(A, B);
  const home = { ...P(B).home };
  const cargos = park(A, { cargo: 5 }, {}, home, 40);
  const fighter = park(A, { fighter: 1 }, {}, { x: home.x + 1, y: home.y }, 40);
  const none = { race: 'machine', ships: {}, tech: {} };
  const unarmed = fleet.battle({ race: 'human', ships: { cargo: 5 }, tech: {} }, none).won;
  const armedWin = fleet.battle({ race: 'human', ships: { fighter: 1 }, tech: {} }, none).won;
  film.look(A, '5 cargos de A sur la planète de B, sans défense ; un chasseur de A à côté', [
    { show: 'victoire sans armes', at: [A, cargos], expected: false, got: unarmed },
    { show: 'victoire armée', at: [A, fighter], expected: true, got: armedWin },
  ]);
  assert.equal(unarmed, false);
  assert.equal(armedWin, true);
});

scenario('D-062 : coûts des vaisseaux', (film) => {
  // Le joueur lit ces coûts sur la fiche de sa planète (chantier naval) : chacun touche la sienne,
  // et les coûts vérifiés de sa race s'affichent en haut de la carte.
  const { players } = newGame(3, ['human', 'machine', 'alien']);
  const want = {
    human: { fighter: { minerals: 150, energy: 50 }, cargo: { minerals: 110, energy: 40 }, heavy: { minerals: 470, energy: 180 } },
    machine: { fighter: { minerals: 90, energy: 40 } },
    alien: { heavy: { minerals: 900, food: 270 } },
  };
  for (const s of players) {
    const race = P(s).race;
    const costs = Object.entries(want[race]).map(([k, cost]) => ({ show: SHIPS[race][k].name, expected: cost, got: SHIPS[race][k].cost }));
    film.look(s, `le joueur ${race} ouvre la fiche de sa planète mère : coût de ses vaisseaux`, [{ sheet: P(s).home, button: true }, ...costs]);
  }
  assert.deepEqual(SHIPS.human.fighter.cost, { minerals: 150, energy: 50 });
  assert.deepEqual(SHIPS.human.cargo.cost, { minerals: 110, energy: 40 });
  assert.deepEqual(SHIPS.human.heavy.cost, { minerals: 470, energy: 180 });
  assert.deepEqual(SHIPS.machine.fighter.cost, { minerals: 90, energy: 40 });
  assert.deepEqual(SHIPS.alien.heavy.cost, { minerals: 900, food: 270 });
});

scenario('D-062 : machines +20 % d’autonomie (30 → 36 cases par plein)', (film) => {
  // Une flotte machine au plein (cargo, chasseur, lourd) ; l'autonomie par vaisseau est vérifiée par les asserts.
  const { players: [A] } = newGame(1, ['machine']);
  const ships = { cargo: 1, fighter: 1, heavy: 1 };
  const id = park(A, ships, {}, { x: 5, y: 5 }, fleet.fleetTank('machine', ships));
  film.look(A, 'une flotte machine au plein : 36 cases d’autonomie par vaisseau', ['cargo', 'fighter', 'heavy'].map((k) => ({ show: `autonomie ${SHIPS.machine[k].name}`, at: [A, id], expected: 36, got: SHIPS.machine[k].tank / SHIPS.machine[k].burn })));
  for (const k of ['cargo', 'fighter', 'heavy']) {
    const s = SHIPS.machine[k];
    assert.equal(s.tank / s.burn, 30 * 1.2, k);
  }
});

// Ressources échangeables : le carburant en fait partie (plein « par échange », D-031).
scenario('D-031 : le carburant s’échange comme les ressources', (film) => {
  // Deux cargos sur la même case, qui peuvent échanger ; la liste des ressources échangeables est vérifiée par l'assert.
  const { A, aid } = meeting();
  film.look(A, 'un cargo de A et un de B sur la même case : ils peuvent échanger du carburant', [{ show: 'carburant échangeable', at: [A, aid], expected: true, got: TRADE_RES.includes('fuel') }]);
  assert.ok(TRADE_RES.includes('fuel'));
});
