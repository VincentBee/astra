// Flottes entre plusieurs téléphones : un même combat ne doit pas compter deux
// fois, une colonie va au premier arrivé, et une flotte en panne tout près de
// sa planète peut y faire le plein. Cas trouvés en faisant jouer des robots.
import assert from 'node:assert/strict';
import { newGame, fleet } from './harness.mjs';
import { scenarios } from './scenario.mjs';

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

scenario('deux de mes flottes sur la même cible : un seul combat, pas de butin en double', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 2 }, { minerals: 900 }, { x: 5, y: 5 }, 40);
  const a1 = park(A, { fighter: 3, cargo: 2 }, {}, { x: 7, y: 5 }, 100);
  P(A).planet.ships = { fighter: 3, cargo: 2 };
  const a2 = A.takeOff('home', { fighter: 3, cargo: 2 }, {}, 0);
  Object.assign(A.myFleet(a2), { from: { x: 7, y: 5 }, to: { x: 7, y: 5 }, fuel: 100 });
  sync(A, B);
  film.look(A, 'deux flottes de A à 2 cases d’un convoi de B (900 minéraux)');
  assert.ok(A.chaseFleet(a1, B.me, bid) && A.chaseFleet(a2, B.me, bid));
  for (let i = 0; i < 40; i++) {
    clock.t += 1000;
    A.tick();
    if (i % 5 === 4) film.look(A, `les deux flottes de A poursuivent le convoi (${i + 1} s)`);
  }
  const looted = P(A).fleets.reduce((t, f) => t + (f.cargo.minerals || 0), 0);
  film.look(A, 'le convoi est pris une seule fois : 900 minéraux en tout, un seul rapport', [
    { show: 'butin des deux flottes', at: [A, a1], expected: 900, got: looted },
    { show: 'combats', expected: 1, got: P(A).effects.length },
  ]);
  assert.equal(looted, 900);
  assert.equal(P(A).effects.length, 1);
});

scenario('poursuite mutuelle livrée des deux côtés en même temps : les pertes ne comptent qu’une fois', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const fa = park(A, { fighter: 10 }, {}, { x: 4, y: 5 }, 300);
  const fb = park(B, { fighter: 10 }, {}, { x: 6, y: 5 }, 300);
  sync(A, B);
  sync(B, A);
  A.chaseFleet(fa, B.me, fb);
  B.chaseFleet(fb, A.me, fa);
  sync(A, B);
  sync(B, A);
  film.look(A, '10 chasseurs de A et 10 de B se poursuivent l’un l’autre');
  for (let i = 0; i < 60; i++) {
    clock.t += 1000;
    A.tick();
    B.tick();
    if (i % 5 === 4) {
      sync(A, B);
      sync(B, A);
      film.look(A, `après ${i + 1} s, fiches échangées`, i === 59 ? once(A, B, fa) : []);
    }
  }
  for (const s of [A, B]) assert.deepEqual(P(s).fleets.map((f) => f.ships), [{ fighter: 2 }], 'comme un seul combat 10 contre 10');
});

/** Ce qui reste à A et à B (chacun chez lui) après un seul combat 10 contre 10 : 2 chasseurs chacun. */
const once = (A, B, fa) => [
  { show: 'flottes de A', at: [A, fa], expected: [{ fighter: 2 }], got: P(A).fleets.map((f) => f.ships) },
  { show: 'flottes de B (chez B)', expected: [{ fighter: 2 }], got: P(B).fleets.map((f) => f.ships) },
];

scenario('flotte rattrapée juste après avoir fondé sa colonie : la colonie encaisse les pertes', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const w = A.planets[5];
  const cell = { x: w.x, y: w.y };
  const bid = park(B, { colony: 1, cargo: 2 }, { minerals: 1200 }, cell, 100);
  B.moveFleet(bid, cell, 'colonize');
  sync(A, B);
  const aid = park(A, { fighter: 10, cargo: 3 }, {}, { x: cell.x + 1, y: cell.y }, 200);
  sync(B, A);
  film.look(A, 'un colon de B (1200 minéraux) arrive sur la planète, une flotte de A à côté');
  clock.t += 1000;
  B.tick();
  film.look(B, 'B fonde sa colonie');
  assert.ok(P(B).colonies[w.id], 'colonie fondée');
  A.chaseFleet(aid, B.me, bid);
  for (let i = 0; i < 10; i++) {
    clock.t += 1000;
    A.tick();
  }
  film.look(A, 'A poursuit et rattrape la flotte de B (10 s)');
  sync(B, A);
  clock.t += 1000;
  B.tick();
  const loot = A.myFleet(aid).cargo.minerals;
  const left = P(B).colonies[w.id].stock.minerals;
  film.look(B, 'B lit le rapport : sa colonie encaisse les pertes, sans minéraux en double', [
    { show: 'pillés + restés', at: cell, expected: '1200 au plus (+ 50 de production)', got: loot + left, ok: loot + left <= 1200 + 50 },
  ]);
  assert.ok(loot + P(B).colonies[w.id].stock.minerals <= 1200 + 50, 'pas de minéraux en double');
});

scenario('colonisation : le premier arrivé l’emporte, même si son téléphone passe après', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const w = A.planets[6];
  const cell = { x: w.x, y: w.y };
  const send = (s, delay) => {
    const id = park(s, { colony: 1, fighter: 2 }, { minerals: 100 }, cell, 100);
    s.moveFleet(id, cell, 'colonize');
    const f = s.myFleet(id);
    f.arrive += delay;
    f.depart += delay;
  };
  send(A, 0);
  send(B, 20_000);
  sync(A, B);
  sync(B, A);
  film.look(A, 'A et B envoient un colon sur la même planète, B arrivera 20 s après A');
  clock.t += 30_000;
  B.tick(); // B passe le premier…
  film.look(B, 'après 30 s, le téléphone de B passe le premier');
  sync(A, B);
  A.tick(); // … mais A était arrivé 20 s avant
  film.look(A, 'puis celui de A, arrivé 20 s avant');
  sync(B, A);
  B.tick();
  sync(A, B);
  A.tick();
  film.look(A, 'fiches échangées : la planète est à A, chez A comme chez B', [
    { show: 'à A, chez A', at: cell, expected: true, got: A.ownerAt(w)?.id === A.me },
    { show: 'à A, chez B', expected: true, got: B.ownerAt(w)?.id === A.me },
    { show: 'colonie chez B', expected: false, got: !!P(B).colonies[w.id] },
  ]);
  assert.equal(A.ownerAt(w)?.id, A.me);
  assert.equal(B.ownerAt(w)?.id, A.me);
  assert.ok(P(A).colonies[w.id] && !P(B).colonies[w.id]);
});

scenario('flotte en panne à moins d’une demi-case de sa planète : elle peut faire le plein', (film) => {
  const { players: [A] } = newGame(2, ['human', 'human']);
  const home = P(A).home;
  const id = park(A, { fighter: 2 }, {}, { x: home.x + 0.3, y: home.y }, 0);
  Object.assign(A.myFleet(id), { stranded: true });
  film.look(A, 'flotte de A en panne, à 0,3 case de sa planète mère');
  const full = A.refuelFleet(id);
  assert.ok(full);
  film.look(A, 'A fait le plein', [{ show: 'plein fait', at: [A, id], expected: true, got: full }]);
});

scenario('plusieurs attaquants qui se voient ne pillent pas plus que le stock du défenseur', (film) => {
  const { players, clock, sync } = newGame(4, ['human', 'machine', 'alien', 'human']);
  const D = players[3];
  const dp = P(D).planet;
  Object.assign(dp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  dp.levels.store = 3;
  D.touch();
  for (const s of players) if (s !== D) sync(s, D);
  const cell = { ...P(D).home };
  const raiders = players.slice(0, 3);
  film.look(players[0], 'la planète de D : 4000 minéraux, 4 chasseurs');
  for (const s of raiders) {
    const id = park(s, { heavy: 6, cargo: 10 }, {}, cell, 500);
    clock.t += 10;
    s.moveFleet(id, cell, 'attack');
    clock.t += 1000;
    s.tick();
    for (const o of raiders) if (o !== s) sync(o, s); // les attaquants se voient entre eux
    film.look(s, `l’attaquant ${raiders.indexOf(s) + 1} sur 3 pille la planète de D`);
  }
  const looted = raiders.reduce((t, s) => t + (P(s).fleets[0]?.cargo?.minerals || 0), 0);
  film.look(players[0], 'les trois attaquants ont pillé : pas plus que le stock de D', [{ show: 'minéraux pillés en tout', at: cell, expected: '4000 au plus', got: looted, ok: looted <= 4000 + 1 }]);
  assert.ok(looted <= 4000 + 1, `pillé ${looted} pour un stock de 4000`);
});

scenario('une revanche plus tard entre les deux mêmes flottes est un vrai combat', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const fa = park(A, { fighter: 30 }, {}, { x: 4, y: 5 }, 300);
  const fb = park(B, { fighter: 30 }, {}, { x: 5, y: 5 }, 300);
  const both = () => {
    sync(A, B);
    sync(B, A);
    clock.t += 1000;
    A.tick();
    B.tick();
  };
  both();
  film.look(B, '30 chasseurs de A et 30 de B, à une case l’un de l’autre');
  assert.ok(B.chaseFleet(fb, A.me, fa)); // combat 1 : B attaque
  film.look(B, 'combat 1 : B attaque');
  for (let i = 0; i < 20; i++) both(); // rapport lu puis effacé partout
  film.look(B, '20 s plus tard : le rapport du combat 1 est lu puis effacé partout');
  const before = countAll(B);
  assert.ok(A.chaseFleet(fa, B.me, fb)); // revanche : A attaque
  const lost = Object.values(P(A).effects.at(-1).ships).reduce((a, b) => a + b, 0);
  film.look(A, 'revanche : A attaque, son rapport compte des pertes chez B', [{ show: 'pertes de B dans le rapport', at: [B, fb], expected: 'plus de 0', got: lost, ok: lost > 0 }]);
  for (let i = 0; i < 20; i++) both();
  film.look(B, '20 s plus tard : B a subi les pertes de la revanche', [{ show: 'vaisseaux perdus par B', at: [B, fb], expected: lost, got: before - countAll(B) }]);
  assert.ok(lost > 0);
  assert.equal(before - countAll(B), lost, 'B subit les pertes de la revanche');
});

/** Vaisseaux de toutes les flottes d'un joueur. */
const countAll = (s) => P(s).fleets.reduce((t, f) => t + Object.values(f.ships).reduce((a, b) => a + b, 0), 0);

scenario('raids : pas d’attaque sans armes, et un seul pillage par planète toutes les 2 min', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bp = P(B).planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 2000, energy: 500 }, ships: {} });
  bp.levels.store = 3;
  B.touch();
  sync(A, B);
  const cell = { ...P(B).home };
  const cargo = park(A, { cargo: 5 }, {}, cell, 200);
  const raid = A.moveFleet(cargo, cell, 'attack');
  film.look(A, '5 cargos de A en orbite sur la planète de B, sans défense : sans armes, pas d’attaque', [{ show: 'attaque acceptée', at: [A, cargo], expected: false, got: raid }]);
  assert.equal(raid, false, 'des cargos seuls ne peuvent pas attaquer');
  P(A).planet.ships = { fighter: 6, cargo: 10 };
  const id = A.takeOff('home', { fighter: 6, cargo: 10 }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 500 });
  const looted = () => Object.values(A.myFleet(id).cargo).reduce((a, b) => a + b, 0);
  for (let i = 0; i < 5; i++) {
    A.moveFleet(id, cell, 'attack');
    clock.t += 1000;
    A.tick();
    const v = looted();
    film.look(A, `une flotte armée de A attaque (${i + 1} s)${i === 4 ? ' : un seul pillage en 5 s' : ''}`, i === 4 ? [{ show: 'butin', at: [A, id], expected: 'entre 1 et 3000', got: v, ok: v > 0 && v <= 3000 }] : []);
  }
  const once = looted();
  assert.ok(once > 0 && once <= 3000, `un seul pillage en 5 s (${once})`);
  clock.t += 3 * 60_000;
  A.moveFleet(id, cell, 'attack');
  clock.t += 1000;
  A.tick();
  film.look(A, '3 min plus tard : nouvelle attaque, nouveau pillage', [{ show: 'butin', at: [A, id], expected: `plus de ${once}`, got: looted(), ok: looted() > once }]);
  assert.ok(looted() > once, 'un nouveau pillage après 2 min');
});

scenario('une flotte va à la vitesse de son vaisseau le plus lent', async (film) => {
  const { fleetSpeed, slowestShip, tripMs } = await import('../js/fleet.js');
  const mixed = { fighter: 5, colony: 1, cargo: 2 };
  // Sur la carte : deux flottes de A partent ensemble pour 12 cases, l'une de 5 chasseurs, l'autre
  // avec un colonisateur en plus ; la rapide arrive la première. Les vitesses sont vérifiées par les asserts.
  const { players: [A], clock } = newGame(1, ['human']);
  const fast = park(A, { fighter: 5 }, {}, { x: 2, y: 3 }, 300);
  const slow = park(A, mixed, {}, { x: 2, y: 6 }, 300);
  A.moveFleet(fast, { x: 14, y: 3 }, 'move');
  A.moveFleet(slow, { x: 14, y: 6 }, 'move');
  film.look(A, 'les deux flottes de A partent ensemble pour 12 cases');
  clock.t = A.myFleet(fast).arrive;
  film.look(A, 'les 5 chasseurs sont arrivés ; la flotte au colonisateur est encore en route', [
    { show: 'arrivée', at: [A, fast], expected: true, got: !fleet.moving(A.myFleet(fast), clock.t) },
    { show: 'encore en route', at: [A, slow], expected: true, got: fleet.moving(A.myFleet(slow), clock.t) },
    { show: 'vaisseau le plus lent', expected: 'colony', got: slowestShip('human', mixed, {}) },
  ]);
  clock.t = A.myFleet(slow).arrive;
  film.look(A, 'la flotte au colonisateur arrive enfin');
  assert.equal(slowestShip('human', mixed, {}), 'colony');
  assert.equal(fleetSpeed('human', mixed, {}), fleetSpeed('human', { colony: 1 }, {}));
  assert.ok(fleetSpeed('human', mixed, {}) < fleetSpeed('human', { fighter: 5 }, {}));
  // Un vaisseau à zéro exemplaire ne ralentit pas la flotte ; une flotte vide ne bouge pas.
  assert.equal(slowestShip('human', { fighter: 5, colony: 0 }, {}), 'fighter');
  assert.equal(slowestShip('human', {}, {}), null);
  assert.equal(fleetSpeed('human', {}, {}), 0);
  // Ajouter un seul vaisseau lent allonge tout le trajet.
  const a = { x: 0, y: 0 }, b = { x: 12, y: 0 };
  assert.ok(tripMs(a, b, fleetSpeed('human', mixed, {})) > tripMs(a, b, fleetSpeed('human', { fighter: 5 }, {})));
});

// ----- Comportement en voyage : passif, agressif (D-100) ---------------------

const fx = (s) => P(s).effects || [];
/** La flotte `id` de `s` détruite, chez `s` (une étiquette en haut de la carte). */
const gone = (s, id, name) => ({ show: name, expected: 'détruit', got: s.myFleet(id) ? 'encore là' : 'détruit' });

/**
 * Fait tourner `s` (et les autres) seconde par seconde, en se passant les fiches toutes les 5 s.
 * `each(i)` : appelé à la fin de chaque seconde (une image du film, par exemple).
 */
function run(players, clock, sync, seconds, each = () => {}) {
  for (let i = 0; i < seconds; i++) {
    clock.t += 1000;
    for (const s of players) s.tick();
    if (i % 5 === 4) for (const a of players) for (const b of players) if (a !== b) sync(a, b);
    each(i);
  }
}

scenario('flotte agressive : elle combat la flotte ennemie qu’elle croise, puis reprend sa route et son ordre', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 2 }, { minerals: 400 }, { x: 6, y: 5 }, 40);
  const aid = park(A, { fighter: 5, cargo: 2 }, {}, { x: 3, y: 5 }, 300);
  sync(A, B);
  assert.ok(A.setFleetStance(aid, 'aggressive'));
  assert.ok(A.moveFleet(aid, { x: 10, y: 5 }, null));
  film.look(A, 'A, agressive, part vers (10:5) ; un convoi de B (400 minéraux) est sur sa route');
  for (let i = 0; i < 30 && !fx(A).length; i++) run([A], clock, () => {}, 1, () => film.look(A, `en route (${i + 1} s)`));
  const f = A.myFleet(aid);
  film.look(A, 'combat livré : A reprend sa route avec le butin', [
    { show: 'combats', expected: 1, got: fx(A).length },
    { show: 'butin', at: [A, aid], expected: 400, got: f.cargo.minerals },
    { show: 'en route vers', at: [A, aid], expected: '10:5', got: fleet.moving(f, clock.t) ? `${f.to.x}:${f.to.y}` : 'arrêtée' },
  ]);
  assert.equal(fx(A).length, 1, 'un combat');
  assert.equal(f.cargo.minerals, 400, 'butin récupéré');
  assert.ok(fleet.moving(f, clock.t), 'la flotte continue');
  assert.deepEqual(f.to, { x: 10, y: 5 }, 'vers sa destination');
  run([A, B], clock, sync, 10, (i) => i % 5 === 4 && film.look(B, `B reçoit les fiches (${i + 1} s)`, i === 9 ? [gone(B, bid, 'convoi de B')] : []));
  assert.equal(B.myFleet(bid), null, 'la flotte de B est détruite chez B aussi');
});

scenario('flotte passive : elle croise une flotte ennemie sans combattre', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  park(B, { fighter: 3 }, {}, { x: 6, y: 5 }, 40);
  const aid = park(A, { fighter: 5 }, {}, { x: 3, y: 5 }, 300);
  sync(A, B);
  sync(B, A);
  film.look(A, 'au décollage, la flotte de A est passive', [{ show: 'comportement', at: [A, aid], expected: 'passive', got: A.myFleet(aid).stance }]);
  assert.equal(A.myFleet(aid).stance, 'passive', 'passive au décollage');
  A.moveFleet(aid, { x: 10, y: 5 }, null);
  film.look(A, 'A, passive, part vers (10:5) en croisant 3 chasseurs de B');
  const calm = () => [
    { show: 'vaisseaux', at: [A, aid], expected: { fighter: 5 }, got: A.myFleet(aid).ships },
    { show: 'combats', expected: 0, got: fx(A).length + fx(B).length },
  ];
  run([A, B], clock, sync, 30, (i) => i % 3 === 2 && film.look(A, `en route (${i + 1} s)`, i === 29 ? calm() : []));
  assert.equal(fx(A).length + fx(B).length, 0);
  assert.deepEqual(A.myFleet(aid).ships, { fighter: 5 }, 'aucune perte');
});

scenario('flotte agressive à l’arrêt : elle garde la case et combat celle qui passe', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const aid = park(A, { fighter: 5 }, {}, { x: 6, y: 5 }, 300);
  const bid = park(B, { fighter: 1 }, {}, { x: 3, y: 5 }, 300);
  A.setFleetStance(aid, 'aggressive');
  sync(A, B);
  sync(B, A);
  B.moveFleet(bid, { x: 10, y: 5 }, null);
  film.look(B, 'A, agressive, garde (6:5) ; un chasseur de B part vers (10:5) et passe par là');
  run([A, B], clock, sync, 40, (i) => i % 4 === 3 && film.look(B, `${i + 1} s`, i === 39 ? [gone(B, bid, 'chasseur de B')] : []));
  assert.equal(B.myFleet(bid), null, 'la flotte de passage est détruite');
});

scenario('deux flottes agressives qui se croisent : les pertes ne comptent qu’une fois', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const fa = park(A, { fighter: 10 }, {}, { x: 3, y: 5 }, 300);
  const fb = park(B, { fighter: 10 }, {}, { x: 9, y: 5 }, 300);
  A.setFleetStance(fa, 'aggressive');
  B.setFleetStance(fb, 'aggressive');
  A.moveFleet(fa, { x: 9, y: 5 }, null);
  B.moveFleet(fb, { x: 3, y: 5 }, null);
  sync(A, B);
  sync(B, A);
  film.look(A, '10 chasseurs agressifs de chaque côté, l’un vers l’autre');
  for (let i = 0; i < 60; i++) {
    clock.t += 250;
    A.tick();
    B.tick();
    if (i % 20 === 19) {
      sync(A, B);
      sync(B, A);
    }
    if (i % 4 === 3) film.look(A, `${(i + 1) / 4} s${i % 20 === 19 ? ', fiches échangées' : ''}`, i === 59 ? once(A, B, fa) : []);
  }
  for (const s of [A, B]) assert.deepEqual(P(s).fleets.map((f) => f.ships), [{ fighter: 2 }], 'comme un seul combat 10 contre 10');
});

scenario('comportement : refusé sans armes, vu par les autres, gardé par la flotte qui en absorbe une autre', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  const unarmed = park(A, { cargo: 2 }, {}, { x: 3, y: 5 }, 40);
  const refused = A.setFleetStance(unarmed, 'aggressive');
  film.look(A, 'deux cargos de A, sans armes : ils ne peuvent pas devenir agressifs', [{ show: 'agressive acceptée', at: [A, unarmed], expected: false, got: refused }]);
  assert.equal(refused, false);
  assert.equal(A.myFleet(unarmed).stance, 'passive');
  const aid = park(A, { fighter: 2 }, {}, { x: 3, y: 5 }, 40);
  assert.ok(A.setFleetStance(aid, 'aggressive'));
  assert.equal(A.setFleetStance(aid, 'aggressive'), false, 'déjà agressive');
  sync(B, A);
  film.look(B, 'B voit la flotte armée de A, agressive', [{ show: 'comportement vu par B', at: [A, aid], expected: 'aggressive', got: B.state.players[A.me].fleets.find((f) => f.id === aid).stance }]);
  assert.equal(B.state.players[A.me].fleets.find((f) => f.id === aid).stance, 'aggressive');
  assert.ok(A.mergeFleets(unarmed, aid));
  film.look(A, 'A fusionne les cargos dans la flotte armée : elle reste agressive', [{ show: 'comportement', at: [A, aid], expected: 'aggressive', got: A.myFleet(aid).stance }]);
  assert.equal(A.myFleet(aid).stance, 'aggressive');
});

// ----- Rencontres que personne n'a regardées (téléphones hors ligne) ----------

/** Mes combats livrés (pas les rapports lus). */
const fought = (s) => (P(s).engaged || []).filter((g) => g.id && !g.got);

scenario('firstContact : l’instant où deux flottes entrent au contact, jamais un contact déjà en cours', (film) => {
  // Sur la carte : une flotte de A part de (0:5) vers (10:5), devant un chasseur de B arrêté en (6:5) ;
  // une image à l'instant du contact. Le calcul est vérifié par les asserts, sur des trajets à plat.
  {
    const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
    const aid = park(A, { fighter: 2 }, {}, { x: 0, y: 5 }, 300);
    const bid = park(B, { fighter: 1 }, {}, { x: 6, y: 5 }, 300);
    A.moveFleet(aid, { x: 10, y: 5 }, 'move');
    sync(A, B);
    film.look(A, 'la flotte de A part de (0:5) vers (10:5) ; un chasseur de B attend en (6:5)');
    const f = A.myFleet(aid);
    const contact = fleet.firstContact(f, B.myFleet(bid), clock.t, f.arrive);
    if (contact) {
      clock.t = contact;
      const p = fleet.fleetPos(f, contact);
      const d = Math.hypot(p.x - 6, p.y - 5);
      film.look(A, 'l’instant du contact : à une demi-case du chasseur de B', [{ show: 'distance au chasseur de B', at: [A, aid], expected: 0.5, got: d, ok: Math.abs(d - 0.5) < 0.01 }]);
    }
    clock.t = f.arrive;
    film.look(A, 'arrivée en (10:5)');
  }
  const seg = (from, to, depart, arrive) => ({ from, to, depart, arrive });
  const still = (at) => seg(at, at, 0, 0);
  // De (0,5) à (10,5) en 10 s, devant une flotte arrêtée en (6,5) : contact à 5,5 cases, soit 5,5 s.
  const a = seg({ x: 0, y: 5 }, { x: 10, y: 5 }, 0, 10_000);
  assert.equal(fleet.firstContact(a, still({ x: 6, y: 5 }), 0, 20_000), 5_500);
  assert.equal(fleet.firstContact(a, still({ x: 6, y: 5 }), 0, 5_000), null, 'pas encore');
  assert.equal(fleet.firstContact(a, still({ x: 6, y: 8 }), 0, 20_000), null, 'passe à 3 cases');
  assert.equal(fleet.firstContact(a, still({ x: 0, y: 5 }), 0, 20_000), null, 'déjà au contact au départ');
  // De face : deux flottes qui se croisent, contact à 0,5 case l'une de l'autre.
  const b = seg({ x: 10, y: 5 }, { x: 0, y: 5 }, 0, 10_000);
  assert.equal(fleet.firstContact(a, b, 0, 20_000), 4_750);
  // Avant le départ du segment, on ne sait pas où était la flotte : on ne regarde pas.
  assert.equal(fleet.firstContact(a, { ...still({ x: 6, y: 5 }), depart: 8_000, arrive: 8_000 }, 0, 20_000), null);
});

scenario('hors ligne : la flotte agressive arrêtée combat celle qui est passée, à l’heure du passage', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const aid = park(A, { fighter: 5 }, {}, { x: 6, y: 5 }, 300);
  const bid = park(B, { fighter: 1 }, {}, { x: 3, y: 5 }, 300);
  A.setFleetStance(aid, 'aggressive');
  B.moveFleet(bid, { x: 12, y: 5 }, null);
  sync(A, B);
  sync(B, A);
  A.tick();
  film.look(A, 'A, agressive, garde (6:5) ; un chasseur de B part vers (12:5) et passera par là');
  const passed = B.myFleet(bid).depart;
  clock.t += 3_600_000; // une heure sans aucun téléphone allumé
  A.tick();
  const at = fx(A)[0]?.at;
  film.look(A, 'une heure plus tard, A se rallume : combat daté du passage', [
    { show: 'combats', expected: 1, got: fx(A).length },
    { show: 'combat', at: [A, aid], expected: 'dans les 30 s du passage', got: at ? `${Math.round((at - passed) / 1000)} s après le départ de B` : 'aucun', ok: at > passed && at < passed + 30_000 },
  ]);
  assert.equal(fx(A).length, 1, 'un combat');
  assert.ok(fx(A)[0].at > passed && fx(A)[0].at < passed + 30_000, 'daté du passage');
  sync(B, A);
  B.tick();
  film.look(B, 'B lit le rapport : sa flotte est détruite', [gone(B, bid, 'chasseur de B')]);
  assert.equal(B.myFleet(bid), null, 'la flotte de passage est détruite');
});

scenario('hors ligne : une flotte passive laisse passer, sans combat', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const aid = park(A, { fighter: 5 }, {}, { x: 6, y: 5 }, 300);
  const bid = park(B, { fighter: 1 }, {}, { x: 3, y: 5 }, 300);
  B.moveFleet(bid, { x: 12, y: 5 }, null);
  sync(A, B);
  A.tick();
  film.look(A, 'A, passive, en (6:5) ; un chasseur de B part vers (12:5) et passera par là');
  clock.t += 3_600_000;
  A.tick();
  film.look(A, 'une heure plus tard, A se rallume : aucun combat', [{ show: 'combats', at: [A, aid], expected: 0, got: fx(A).length }]);
  assert.equal(fx(A).length, 0);
});

scenario('hors ligne : la poursuite combat au point de rencontre, même si la cible est ensuite hors de vue', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 1 }, {}, { x: 2, y: 2 }, 300);
  const aid = park(A, { fighter: 3 }, {}, { x: 3, y: 3 }, 300);
  B.moveFleet(bid, { x: 18, y: 2 }, null);
  sync(A, B);
  A.tick();
  assert.ok(A.chaseFleet(aid, B.me, bid));
  film.look(A, 'A poursuit un cargo de B qui part vers (18:2) : pas encore au contact', [{ show: 'combats', at: [A, aid], expected: 0, got: fx(A).length }]);
  assert.equal(fx(A).length, 0, 'pas encore au contact');
  clock.t += 3_600_000;
  A.tick();
  const met = fx(A)[0]?.at;
  film.look(A, 'une heure plus tard, A se rallume : combat au point de rencontre', [
    { show: 'combats', expected: 1, got: fx(A).length },
    { show: 'combat', expected: 'avant l’arrivée du cargo', got: met ? `${Math.round((B.myFleet(bid).arrive - met) / 1000)} s avant` : 'aucun', ok: met < B.myFleet(bid).arrive },
    { show: 'cible perdue de vue', expected: false, got: A.state.log.some((l) => /perd sa cible/.test(l.text)) },
  ]);
  assert.equal(fx(A).length, 1, 'un combat');
  assert.ok(fx(A)[0].at < B.myFleet(bid).arrive, 'pendant le trajet de la cible');
  assert.ok(!A.state.log.some((l) => /perd sa cible/.test(l.text)), 'pas « perdue de vue »');
});

scenario('hors ligne : un combat livré en ligne ne se rejoue pas au retour', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const aid = park(A, { fighter: 1 }, {}, { x: 6, y: 5 }, 300);
  const bid = park(B, { heavy: 3 }, {}, { x: 3, y: 5 }, 300);
  A.setFleetStance(aid, 'aggressive');
  B.moveFleet(bid, { x: 12, y: 5 }, null);
  sync(A, B);
  sync(B, A);
  film.look(A, 'A, agressive, garde (6:5) ; 3 lourds de B passent vers (12:5)');
  const live = () => [{ show: 'combats livrés', at: [A, aid], expected: 'au moins 1', got: fought(A).length, ok: fought(A).length >= 1 }];
  run([A, B], clock, sync, 40, (i) => i % 4 === 3 && film.look(A, `en ligne (${i + 1} s)`, i === 39 ? live() : []));
  const before = fought(A).length;
  assert.ok(before >= 1, 'un combat en ligne');
  clock.t += 3_600_000;
  A.tick();
  B.tick();
  film.look(A, 'une heure plus tard, au retour : rien de plus', [{ show: 'combats livrés', expected: before, got: fought(A).length }]);
  assert.equal(fought(A).length, before, 'rien de plus au retour');
});

scenario('hors ligne tous les deux : deux flottes agressives qui se sont croisées, pertes comptées une fois', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const fa = park(A, { fighter: 10 }, {}, { x: 3, y: 5 }, 300);
  const fb = park(B, { fighter: 10 }, {}, { x: 9, y: 5 }, 300);
  A.setFleetStance(fa, 'aggressive');
  B.setFleetStance(fb, 'aggressive');
  A.moveFleet(fa, { x: 9, y: 5 }, null);
  B.moveFleet(fb, { x: 3, y: 5 }, null);
  sync(A, B);
  sync(B, A);
  A.tick();
  B.tick();
  film.look(A, '10 chasseurs agressifs de chaque côté partent l’un vers l’autre');
  clock.t += 3_600_000;
  A.tick();
  B.tick();
  film.look(A, 'une heure plus tard, les deux téléphones se rallument');
  run([A, B], clock, sync, 10, (i) => i % 5 === 4 && film.look(A, `fiches échangées (${i + 1} s)`, i === 9 ? once(A, B, fa) : []));
  for (const s of [A, B]) assert.deepEqual(P(s).fleets.map((f) => f.ships), [{ fighter: 2 }], 'comme un seul combat 10 contre 10');
});

// ----- Jonction : toucher une autre de mes flottes pour la rejoindre et fusionner (D-159) -----

/** Fait passer le temps par pas d'une seconde jusqu'à ce que `done()` soit vrai (2 min de jeu au plus). */
function until(s, clock, done, film, label) {
  for (let i = 0; i < 120 && !done(); i++) {
    clock.t += 1000;
    s.tick();
  }
  if (film) film.look(s, label);
}

scenario('jonction : une flotte en rejoint une autre, arrêtée ailleurs, et elles fusionnent à l’arrivée', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const a = park(A, { fighter: 2 }, {}, { x: 3, y: 5 }, 60);
  const b = park(A, { cargo: 1 }, { minerals: 50 }, { x: 6, y: 5 }, 30);
  film.look(A, 'A a deux flottes : 2 frégates en (3:5), un cargo chargé en (6:5)');
  assert.ok(A.joinFleet(a, b));
  assert.equal(A.myFleet(a).order.kind, 'join');
  assert.ok(fleet.moving(A.myFleet(a), clock.t + 1));
  film.look(A, 'A touche le cargo, flotte des frégates choisie : « Rejoindre et fusionner », elles partent', [{ show: 'ordre', at: [A, a], expected: 'join', got: A.myFleet(a).order?.kind }]);
  until(A, clock, () => !A.myFleet(a), film, 'arrivées : les deux flottes n’en font plus qu’une');
  assert.equal(A.myFleet(a), null);
  const g = A.myFleet(b);
  assert.deepEqual(g.ships, { fighter: 2, cargo: 1 });
  assert.equal(g.cargo.minerals, 50);
  assert.ok(g.absorbed.includes(a));
  assert.ok(A.state.log.some((l) => l.text.includes('elles fusionnent')));
});

scenario('jonction : déjà arrêtées sur la même case, la fusion est immédiate', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const a = park(A, { fighter: 2 }, {}, { x: 3, y: 5 }, 60);
  const b = park(A, { fighter: 1 }, {}, { x: 3, y: 5 }, 30);
  assert.ok(A.joinFleet(a, b));
  film.look(A, 'deux flottes sur la même case : une seule, tout de suite', [{ show: 'flottes de A', expected: 1, got: P(A).fleets.length }]);
  assert.equal(P(A).fleets.length, 1);
  assert.deepEqual(A.myFleet(b).ships, { fighter: 3 });
});

scenario('jonction : la flotte à rejoindre est en route vers la même case, on l’attend', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const b = park(A, { cargo: 1 }, {}, { x: 0, y: 5 }, 60);
  const a = park(A, { fighter: 1 }, {}, { x: 8, y: 5 }, 60);
  assert.ok(A.moveFleet(b, { x: 7, y: 5 }));
  assert.ok(A.joinFleet(a, b));
  assert.deepEqual(A.myFleet(a).to, { x: 7, y: 5 }, 'elle vise là où l’autre va');
  film.look(A, 'le cargo part vers (7:5) ; la frégate, tout près, part l’y attendre');
  until(A, clock, () => !fleet.moving(A.myFleet(a), clock.t), film, 'la frégate est arrivée la première : elle attend, l’ordre gardé');
  assert.equal(A.myFleet(a).order?.kind, 'join');
  until(A, clock, () => !A.myFleet(a), film, 'le cargo arrive : elles fusionnent');
  assert.deepEqual(A.myFleet(b).ships, { cargo: 1, fighter: 1 });
});

scenario('jonction : la flotte à rejoindre est partie ailleurs, on reste sur place', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const a = park(A, { fighter: 1 }, {}, { x: 3, y: 5 }, 60);
  const b = park(A, { cargo: 1 }, {}, { x: 6, y: 5 }, 60);
  assert.ok(A.joinFleet(a, b));
  assert.ok(A.moveFleet(b, { x: 6, y: 12 }));
  film.look(A, 'la frégate part rejoindre le cargo, mais le cargo s’en va vers (6:12)');
  until(A, clock, () => !fleet.moving(A.myFleet(a), clock.t) && !A.myFleet(a).order, film, 'la frégate arrive en (6:5) : plus personne, elle y reste');
  assert.equal(P(A).fleets.length, 2);
  assert.deepEqual(A.myFleet(a).to, { x: 6, y: 5 });
  assert.equal(A.myFleet(a).order, null);
  assert.ok(A.state.log.some((l) => l.text.includes('ne trouve plus la flotte à rejoindre')));
});

scenario('jonction : refusée vers une flotte qui n’est pas à moi, ou vers elle-même', (film) => {
  const { players: [A, B] } = newGame(2, ['human', 'human']);
  const toasts = [];
  A.ontoast = (m) => toasts.push(m);
  const a = park(A, { fighter: 1 }, {}, { x: 3, y: 5 }, 60);
  const foe = park(B, { fighter: 1 }, {}, { x: 6, y: 5 }, 60);
  assert.equal(A.joinFleet(a, foe), false);
  assert.equal(A.joinFleet(a, a), false);
  film.look(A, 'rejoindre une flotte de B, ou elle-même : refusé, rien ne bouge', [{ show: 'refus', expected: 2, got: toasts.length }]);
  assert.equal(toasts.length, 2);
  assert.equal(A.myFleet(a).order, null);
});

// #73 : la fenêtre Scinder / Donner garde l'identifiant de sa flotte. Si cette flotte meurt au
// combat pendant que la fenêtre est ouverte, le bouton ne reste plus muet : la session refuse
// avec « Flotte introuvable. » (la fermeture de la fenêtre elle-même est dans js/app.js,
// `refreshMoveSheet`, vérifiée dans le vrai jeu).
scenario('flotte détruite au combat pendant « Scinder » ou « Donner » : refus « Flotte introuvable. », sans planter', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'machine']);
  B.state.players[B.me].planet.ships = { fighter: 18 };
  B.touch();
  sync(A, B);
  const cell = { x: B.state.players[B.me].home.x, y: B.state.players[B.me].home.y };
  // Deux flottes de A arrêtées ensemble chez B : 3 chasseurs (la fenêtre est ouverte sur elle), 1 chasseur (celle qui reçoit).
  const tank = fleet.fleetTank('human', { fighter: 1 });
  const id = park(A, { fighter: 4 }, {}, cell, tank * 2);
  const other = A.splitFleet(id, { ships: { fighter: 1 }, fuel: Math.floor(tank / 2) });
  assert.ok(other, 'Scinder marche sur une flotte qui existe');
  assert.ok(A.transferFleet(id, other, { fuel: 1 }), 'Donner marche sur une flotte qui existe');
  film.look(A, 'A : deux flottes de chasseurs en orbite chez B (18 drones) ; la fenêtre « Scinder » est ouverte sur la plus grosse');

  const toasts = [];
  A.ontoast = (t) => toasts.push(t);
  A.moveFleet(id, cell, 'attack');
  A.tick();
  film.look(A, 'après le combat : la flotte de la fenêtre n’existe plus', [{ show: 'flotte', expected: 'détruite', got: A.myFleet(id) ? 'encore là' : 'détruite', ok: !A.myFleet(id) }]);
  assert.equal(A.myFleet(id), null, 'la flotte a été détruite');

  toasts.length = 0;
  assert.equal(A.splitFleet(id, { ships: { fighter: 1 } }), false, 'Scinder sur la flotte disparue : refus');
  assert.deepEqual(toasts, ['Flotte introuvable.'], 'Scinder le dit');
  toasts.length = 0;
  const to = A.myFleet(other) ? other : 'x';
  assert.equal(A.transferFleet(id, to, { fuel: 1 }), false, 'Donner depuis la flotte disparue : refus');
  assert.deepEqual(toasts, ['Flotte introuvable.'], 'Donner le dit');
  toasts.length = 0;
  assert.equal(A.splitFleet(null, { ships: { fighter: 1 } }), false, 'sans flotte du tout : refus');
  assert.deepEqual(toasts, ['Flotte introuvable.']);
  film.look(A, 'A touche « Scinder » puis « Donner » : refus « Flotte introuvable. », aucune erreur', [{ show: 'message', expected: 'Flotte introuvable.', got: 'Flotte introuvable.', ok: true }]);
});
