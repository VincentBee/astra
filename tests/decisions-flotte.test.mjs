// Décisions du domaine flottes / voyage / carburant / combat / échanges /
// anti-triche (docs/decisions.md). Chaque test porte le numéro de la décision
// qu'il protège ; il vérifie ce que dit la doc, pas ce que fait le code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, fleet, clone } from './harness.mjs';

// Après le harness : les globals du navigateur sont déjà en place.
const { normalize, ORDER_KINDS, Session } = await import('../js/session.js');
const { SHIPS, TECHS, sightRange } = await import('../js/tech.js');
const { OFFER_MS, ABANDON_MS, TRADE_RES } = await import('../js/trade.js');

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

/** Avance l'horloge seconde par seconde en faisant passer `players`. */
function run(clock, players, seconds) {
  for (let i = 0; i < seconds; i++) {
    clock.t += 1000;
    for (const s of players) s.tick();
  }
}

// ----- D-017 : plus de déplacement aux flèches -------------------------------

test('D-017 : une fiche d’avant garde sa position aux flèches, elle disparaît', () => {
  const { players: [A, B] } = newGame(2);
  forge(A, B, (st) => Object.assign(st.players[B.me], { pos: { x: 3, y: 3 }, actAt: st.players[B.me].actAt + 1000 }));
  assert.equal(A.state.players[B.me].pos, undefined);
  assert.equal(normalize({ pos: { x: 1, y: 1 } }).pos, undefined);
});

// ----- D-020 : coloniser, transporter, combattre -----------------------------

test('D-020 : transport — une flotte chargée qui se pose sur une autre de mes planètes y dépose sa cargaison', () => {
  const { players: [A], clock } = newGame(2, ['human', 'human']);
  const w = A.planets[5];
  const cell = { x: w.x, y: w.y };
  const cid = park(A, { colony: 1 }, {}, cell, 100);
  A.moveFleet(cid, cell, 'colonize');
  run(clock, [A], 1);
  const colony = P(A).colonies[w.id];
  assert.ok(colony, 'colonie fondée');
  // Un cargo part de la planète mère, plein de minéraux, et se pose sur la colonie.
  const id = park(A, { cargo: 1 }, { minerals: 300 }, { x: cell.x + 1, y: cell.y }, 40);
  assert.ok(A.moveFleet(id, cell, 'dock'));
  const arrive = A.myFleet(id).arrive;
  const before = clone(colony);
  clock.t = arrive;
  A.tick();
  assert.equal(A.myFleet(id), null, 'la flotte s’est posée');
  const expected = game.stateAt(before, arrive).stock.minerals + 300;
  assert.ok(Math.abs(P(A).colonies[w.id].stock.minerals - expected) < 1, `${P(A).colonies[w.id].stock.minerals} ≠ ${expected}`);
});

// ----- D-022 : le téléphone de l'attaquant calcule ---------------------------

test('D-022 : le défenseur n’applique ses pertes qu’en lisant le rapport de l’attaquant', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { ships: { fighter: 4 } });
  B.touch();
  sync(A, B);
  const cell = { ...P(B).home };
  const id = park(A, { fighter: 20 }, {}, cell, 400);
  assert.ok(A.moveFleet(id, cell, 'attack'));
  clock.t += 1000;
  A.tick();
  assert.equal(P(A).effects.length, 1, 'A a écrit le rapport du combat');
  assert.equal(P(B).planet.ships.fighter, 4, 'B n’a encore rien perdu');
  sync(B, A);
  B.tick();
  assert.equal(P(B).planet.ships.fighter || 0, 0, 'B applique les pertes calculées par A');
});

// ----- D-026 : une seule carte -------------------------------------------------

test('D-026 : les flottes voyagent sur la carte unique, pas au-delà', () => {
  const { players: [A] } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 10, y: 10 }, 80);
  assert.equal(A.moveFleet(id, { x: game.UNIVERSE.w, y: 10 }, 'move'), false);
  assert.equal(A.moveFleet(id, { x: -1, y: 10 }, 'move'), false);
  assert.equal(A.moveFleet(id, { x: 10, y: game.UNIVERSE.h }, 'move'), false);
  assert.equal(A.moveFleet(id, { x: game.UNIVERSE.w - 1, y: 10 }, 'move'), true);
});

// ----- D-027 / D-032 : le voyage coûte du carburant, le carburant est de l'énergie

test('D-027 : chaque case parcourue brûle du carburant', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 80);
  assert.ok(A.moveFleet(id, { x: 8, y: 5 }, 'move'));
  clock.t = A.myFleet(id).arrive + 1000;
  // 2 frégates × 1 par case × 3 cases.
  assert.equal(fleet.fuelAt(A.myFleet(id), 'human', clock.t), 80 - 6);
});

test('D-032 : le carburant est pris dans l’énergie de la planète, et y retourne en se posant', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const pl = P(A).planet;
  Object.assign(pl, { ships: { fighter: 2 }, stock: { ...pl.stock, energy: 500 } });
  pl.levels.store = 3;
  const e0 = game.stateAt(pl, clock.t).stock.energy;
  const id = A.takeOff('home', { fighter: 2 }, {}, 30);
  assert.ok(id);
  assert.ok(Math.abs(P(A).planet.stock.energy - (e0 - 30)) < 1e-6, 'le plein coûte 30 d’énergie');
  assert.ok(A.moveFleet(id, { ...P(A).home }, 'dock'));
  A.tick();
  assert.equal(A.myFleet(id), null);
  assert.ok(Math.abs(game.stateAt(P(A).planet, clock.t).stock.energy - e0) < 1, 'le carburant non brûlé revient au stock');
});

test('D-032 : on peut scinder une flotte en deux', () => {
  const { players: [A] } = newGame(1, ['human']);
  const id = park(A, { fighter: 5 }, {}, { x: 5, y: 5 }, 100);
  const other = A.splitFleet(id, { ships: { fighter: 2 }, fuel: 40 });
  assert.ok(other);
  assert.deepEqual(A.myFleet(id).ships, { fighter: 3 });
  assert.deepEqual(A.myFleet(other).ships, { fighter: 2 });
  assert.equal(A.myFleet(other).fuel, 40);
});

// ----- D-028 : pilotage comme dans un jeu de stratégie en temps réel -----------

test('D-028 : changement de cap en route, arrêt, rappel et stationnement', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const id = park(A, { fighter: 2 }, {}, { x: 2, y: 5 }, 80);
  assert.ok(A.moveFleet(id, { x: 12, y: 5 }, 'move'));
  clock.t += 40_000 / game.TEMPO; // trajets TEMPO fois plus courts (D-083)
  const here = fleet.fleetPos(A.myFleet(id), clock.t);
  assert.ok(here.x > 3 && here.x < 11, 'en route');
  // Changement de cap : le nouveau trajet part de là où elle est.
  assert.ok(A.moveFleet(id, { x: 6, y: 9 }, 'move'));
  const f = A.myFleet(id);
  assert.ok(Math.abs(f.from.x - here.x) < 1e-6 && Math.abs(f.from.y - here.y) < 1e-6, 'repart de sa position');
  assert.equal(f.depart, clock.t);
  // Arrêt : elle finit sur la case entière la plus proche.
  clock.t += 3000;
  assert.ok(A.stopFleet(id));
  assert.ok(Number.isInteger(A.myFleet(id).to.x) && Number.isInteger(A.myFleet(id).to.y));
  // Stationnement : arrêtée sans ordre, elle reste sur la carte.
  run(clock, [A], 30);
  assert.ok(A.myFleet(id), 'la flotte attend sur place');
  assert.equal(fleet.moving(A.myFleet(id), clock.t), false);
  // Rappel : elle rentre se poser chez elle.
  assert.ok(A.returnFleet(id));
  assert.deepEqual(A.myFleet(id).order, { kind: 'dock', key: 'home' });
});

// ----- D-029 : interception en route -------------------------------------------

test('D-029 : le point d’interception est sur le trajet de la cible, avant son arrivée', () => {
  const t0 = 1_000_000;
  const target = { ships: { cargo: 1 }, from: { x: 2, y: 5 }, to: { x: 19, y: 5 }, depart: t0, arrive: t0 + 17 * 12_000 };
  const chaser = { ships: { fighter: 1 }, from: { x: 3, y: 7 }, to: { x: 3, y: 7 }, depart: t0, arrive: t0 };
  const p = fleet.intercept(chaser, 'human', {}, target, t0);
  assert.equal(p.y, 5);
  assert.ok(p.x > 2 && p.x < 19, `point d’interception ${p.x} pas en route`);
});

test('D-029 : une flotte en route est rattrapée et combattue avant d’arriver', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 2 }, {}, { x: 3, y: 5 }, 80);
  assert.ok(B.moveFleet(bid, { x: 19, y: 5 }, 'move'));
  const arrive = B.myFleet(bid).arrive;
  const aid = park(A, { fighter: 5 }, {}, { x: 4, y: 6 }, 200);
  sync(A, B);
  assert.ok(A.chaseFleet(aid, B.me, bid));
  run(clock, [A], 120);
  const e = P(A).effects.find((x) => x.fleet === bid);
  assert.ok(e, 'combat livré');
  assert.ok(e.at < arrive, 'pendant le trajet de la cible');
});

// ----- D-030 : ordres, réservoir, rencontre, vision ------------------------------

test('D-030 : un seul réservoir par flotte, la somme de ceux de ses vaisseaux', () => {
  assert.equal(fleet.fleetTank('human', { fighter: 2, heavy: 1 }), 2 * SHIPS.human.fighter.tank + SHIPS.human.heavy.tank);
  assert.equal(fleet.fleetBurn('human', { fighter: 2, heavy: 1 }), 2 * SHIPS.human.fighter.burn + SHIPS.human.heavy.burn);
});

test('D-030 : deux flottes ennemies qui se rencontrent ne combattent pas toutes seules, elles peuvent échanger', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const cell = { x: 5, y: 5 };
  const aid = park(A, { fighter: 5 }, {}, cell, 100);
  const bid = park(B, { fighter: 5 }, {}, cell, 100);
  for (let i = 0; i < 10; i++) {
    sync(A, B);
    sync(B, A);
    run(clock, [A, B], 1);
  }
  assert.equal((P(A).effects || []).length + (P(B).effects || []).length, 0, 'aucun combat automatique');
  assert.deepEqual(A.myFleet(aid).ships, { fighter: 5 });
  assert.deepEqual(B.myFleet(bid).ships, { fighter: 5 });
  assert.ok(A.tradePartners({ fleet: aid }).some((t) => t.pid === B.me && t.ref.fleet === bid), 'échange proposé');
});

test('D-030 : la portée de détection s’améliore avec la recherche', () => {
  for (const race of ['human', 'machine', 'alien']) {
    const key = Object.keys(TECHS[race]).find((k) => TECHS[race][k].range);
    assert.equal(sightRange(race, { [key]: 2 }, 'fleet'), sightRange(race, {}, 'fleet') + 2, race);
  }
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, {}, { x: 5, y: 10 }, 40);
  const aid = park(A, { fighter: 2 }, {}, { x: 8, y: 10 }, 80);
  sync(A, B);
  assert.equal(A.chaseFleet(aid, B.me, bid), false, 'hors de portée à 3 cases');
  P(A).planet.tech = { ...P(A).planet.tech, radar: 1 };
  assert.equal(A.chaseFleet(aid, B.me, bid), true, 'visible avec le radar');
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

test('D-031 : un échange se fait par proposition puis accord', () => {
  const { A, B, aid, bid, clock, sync } = meeting();
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 100 }, { fuel: 10 });
  assert.ok(id);
  assert.equal(A.myFleet(aid).cargo.minerals, 100, 'ce que A donne part sous séquestre');
  assert.equal(B.myFleet(bid).cargo.minerals || 0, 0, 'rien chez B avant son accord');
  sync(B, A);
  clock.t += 1000;
  assert.ok(B.answerTrade(A.me, id, true));
  assert.equal(B.myFleet(bid).cargo.minerals, 100);
  assert.equal(Math.round(fleet.fuelAt(B.myFleet(bid), 'human', clock.t)), 30);
  sync(A, B);
  A.tick();
  assert.equal(Math.round(fleet.fuelAt(A.myFleet(aid), 'human', clock.t)), 30, 'A reçoit le carburant demandé');
});

test('D-031 : le plein se fait sur ses planètes, pas sur celle d’un autre', () => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  sync(A, B);
  const there = park(A, { fighter: 2 }, {}, { ...P(B).home }, 0);
  assert.equal(A.refuelFleet(there), false);
  const home = park(A, { fighter: 2 }, {}, { ...P(A).home }, 0);
  assert.equal(A.refuelFleet(home), true);
});

test('D-031 : deux de mes flottes sur la même case se passent du carburant et fusionnent, pas à distance', () => {
  const { players: [A], clock } = newGame(1, ['human']);
  const a = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 80);
  const b = park(A, { fighter: 2 }, {}, { x: 5, y: 5 }, 10);
  const far = park(A, { fighter: 2 }, {}, { x: 9, y: 5 }, 10);
  assert.equal(A.transferFleet(a, far, { fuel: 10 }), false, 'pas à distance');
  assert.ok(A.transferFleet(a, b, { fuel: 30 }));
  assert.equal(fleet.fuelAt(A.myFleet(b), 'human', clock.t), 40);
  assert.ok(A.mergeFleets(a, b));
  assert.equal(A.myFleet(a), null);
  assert.deepEqual(A.myFleet(b).ships, { fighter: 4 });
  assert.equal(fleet.fuelAt(A.myFleet(b), 'human', clock.t), 90);
});

test('D-031 : une flotte à sec reste bloquée jusqu’à ce qu’on la secoure', () => {
  const { A, B, aid, bid, clock, sync } = meeting();
  Object.assign(A.myFleet(aid), { fuel: 0, stranded: true });
  A.touch();
  assert.equal(A.moveFleet(aid, { x: 6, y: 5 }, 'move'), false, 'à sec, elle ne bouge pas');
  sync(B, A);
  // Secours : B lui donne du carburant par un échange.
  const id = B.proposeTrade({ fleet: bid }, { pid: A.me, fleet: aid }, { fuel: 20 }, {});
  assert.ok(id);
  sync(A, B);
  clock.t += 1000;
  assert.ok(A.answerTrade(B.me, id, true));
  assert.equal(A.moveFleet(aid, { x: 6, y: 5 }, 'move'), true, 'ravitaillée, elle repart');
});

test('D-031 : une technologie de détection par race', () => {
  for (const race of ['human', 'machine', 'alien']) {
    assert.equal(Object.values(TECHS[race]).filter((t) => t.range).length, 1, race);
  }
});

// ----- D-034 : offre de 5 min, non annulable --------------------------------------

test('D-034 : une offre vaut 5 min', () => {
  const { A, B, aid, bid } = meeting();
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
  const o = P(A).offers.find((x) => x.id === id);
  assert.equal(o.expires - o.at, 5 * 60_000);
  assert.equal(OFFER_MS, 5 * 60_000);
});

test('D-034 : acceptée juste avant 5 min elle vaut, juste après elle est refusée', () => {
  for (const [delay, ok] of [[5 * 60_000 - 1000, true], [5 * 60_000 + 1000, false]]) {
    const { A, B, aid, bid, clock, sync } = meeting();
    const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
    sync(B, A);
    clock.t += delay;
    assert.equal(B.answerTrade(A.me, id, true), ok, `à ${delay} ms`);
  }
});

test('D-034 : une offre ne s’annule pas, et la flotte qui propose attend la réponse', () => {
  const { A, B, aid, bid } = meeting();
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 50 }, {});
  assert.ok(id);
  assert.ok(!ORDER_KINDS.some((k) => /cancel|annul/i.test(k)), 'aucun ordre pour annuler');
  assert.ok(!Object.getOwnPropertyNames(Session.prototype).some((k) => /cancel.*(trade|offer)/i.test(k)));
  assert.equal(A.moveFleet(aid, { x: 6, y: 5 }, 'move'), false, 'bloquée');
  assert.equal(A.splitFleet(aid, { ships: { cargo: 1 } }), false, 'bloquée');
});

// ----- D-036 : limites acceptées du pair à pair -----------------------------------

test('D-036 (modifiée par D-095) : une flotte en orbite ne défend pas la planète', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const home = { ...P(B).home };
  const guard = park(B, { fighter: 10 }, {}, home, 100); // en orbite, pas posée
  const bp = P(B).planet;
  // Sans bâtiment : la planète n'a pas de défense propre (D-095), seuls ses vaisseaux posés la défendraient.
  Object.assign(bp, { ships: {}, levels: {}, stock: { ...bp.stock, minerals: 2000 } });
  B.touch();
  sync(A, B);
  const id = park(A, { fighter: 3, cargo: 2 }, {}, home, 200);
  assert.ok(A.moveFleet(id, home, 'attack'));
  clock.t += 1000;
  A.tick();
  const e = P(A).effects.at(-1);
  assert.ok(e.take.minerals > 0, 'planète sans vaisseau posé : pillée');
  assert.deepEqual(A.myFleet(id).ships, { fighter: 3, cargo: 2 }, 'aucune perte : personne ne défend');
  sync(B, A);
  B.tick();
  assert.deepEqual(B.myFleet(guard).ships, { fighter: 10 }, 'la flotte en orbite n’a pas combattu');
});

// ----- D-059 : limites d'affichage défensives ---------------------------------------

test('D-059 : noms à 16 caractères et couleurs de joueur filtrées', () => {
  const { players: [A, B] } = newGame(2);
  forge(A, B, (st) => Object.assign(st.players[B.me], { name: 'N'.repeat(40), color: 'red;background:url(x)', actAt: st.players[B.me].actAt + 1000 }));
  const b = A.state.players[B.me];
  assert.equal(b.name.length, 16);
  assert.match(b.color, /^#[0-9a-f]{6}$/i);
  assert.notEqual(b.color, 'red;background:url(x)');
  assert.equal(normalize({ name: 'Zoé', color: '#12ab9f' }).color, '#12ab9f', 'une vraie couleur est gardée');
});

// ----- D-061 : anti-triche et tolérance d'horloge -----------------------------------

test('D-061 : une horloge en avance est tolérée jusqu’à un jour, pas au-delà', () => {
  for (const [ahead, kept] of [[23 * 3_600_000, true], [25 * 3_600_000, false]]) {
    const { players: [A, B], clock } = newGame(2);
    const t = clock.t + ahead;
    forge(A, B, (st) => (st.players[B.me].actAt = t));
    assert.equal(A.state.players[B.me].actAt === t, kept, `${ahead / 3_600_000} h d’avance`);
  }
});

test('D-061 : un échange accepté à temps mais su très en retard est conclu après coup depuis la planète mère', () => {
  const { A, B, aid, bid, clock, sync } = meeting();
  const id = A.proposeTrade({ fleet: aid }, { pid: B.me, fleet: bid }, { minerals: 100 }, { fuel: 20 });
  sync(B, A);
  clock.t += 60_000;
  assert.ok(B.answerTrade(A.me, id, true)); // A n'en sait rien
  clock.t += OFFER_MS + ABANDON_MS;
  A.tick();
  assert.equal(P(A).offers.length, 0);
  assert.equal(A.myFleet(aid).cargo.minerals, 200, 'faute de nouvelles, A a repris sa part');
  assert.equal(P(A).dropped.length, 1);
  const before = game.stateAt(P(A).planet, clock.t).stock;
  sync(A, B); // la réponse de B arrive enfin
  A.tick();
  const after = game.stateAt(P(A).planet, clock.t).stock;
  assert.equal(P(A).dropped.length, 0);
  assert.ok(Math.abs(after.minerals - (before.minerals - 100)) < 1, 'A rend ce qu’il avait repris');
  assert.ok(Math.abs(after.energy - (before.energy + 20)) < 1, 'A reçoit ce qu’il demandait');
});

// ----- D-062 : pas d'attaque sans armes, coûts des vaisseaux ------------------------

test('D-062 : une flotte sans armes ne peut pas en prendre une autre en chasse', () => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, { minerals: 300 }, { x: 5, y: 5 }, 40);
  const aid = park(A, { cargo: 5 }, {}, { x: 6, y: 5 }, 40);
  sync(A, B);
  assert.equal(A.chaseFleet(aid, B.me, bid), false);
});

test('D-062 : sans armes, pas de victoire, même contre personne', () => {
  const none = { race: 'machine', ships: {}, tech: {} };
  assert.equal(fleet.battle({ race: 'human', ships: { cargo: 5 }, tech: {} }, none).won, false);
  assert.equal(fleet.battle({ race: 'human', ships: { fighter: 1 }, tech: {} }, none).won, true);
});

test('D-062 : coûts des vaisseaux', () => {
  assert.deepEqual(SHIPS.human.fighter.cost, { minerals: 150, energy: 50 });
  assert.deepEqual(SHIPS.human.cargo.cost, { minerals: 110, energy: 40 });
  assert.deepEqual(SHIPS.human.heavy.cost, { minerals: 470, energy: 180 });
  assert.deepEqual(SHIPS.machine.fighter.cost, { minerals: 90, energy: 40 });
  assert.deepEqual(SHIPS.alien.heavy.cost, { minerals: 900, food: 270 });
});

test('D-062 : machines +20 % d’autonomie (30 → 36 cases par plein)', () => {
  for (const k of ['cargo', 'fighter', 'heavy']) {
    const s = SHIPS.machine[k];
    assert.equal(s.tank / s.burn, 30 * 1.2, k);
  }
});

// Ressources échangeables : le carburant en fait partie (plein « par échange », D-031).
test('D-031 : le carburant s’échange comme les ressources', () => {
  assert.ok(TRADE_RES.includes('fuel'));
});
