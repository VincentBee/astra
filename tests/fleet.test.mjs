// Flottes entre plusieurs téléphones : un même combat ne doit pas compter deux
// fois, une colonie va au premier arrivé, et une flotte en panne tout près de
// sa planète peut y faire le plein. Cas trouvés en faisant jouer des robots.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';

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

test('deux de mes flottes sur la même cible : un seul combat, pas de butin en double', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bid = park(B, { cargo: 2 }, { minerals: 900 }, { x: 5, y: 5 }, 40);
  const a1 = park(A, { fighter: 3, cargo: 2 }, {}, { x: 7, y: 5 }, 100);
  P(A).planet.ships = { fighter: 3, cargo: 2 };
  const a2 = A.takeOff('home', { fighter: 3, cargo: 2 }, {}, 0);
  Object.assign(A.myFleet(a2), { from: { x: 7, y: 5 }, to: { x: 7, y: 5 }, fuel: 100 });
  sync(A, B);
  assert.ok(A.chaseFleet(a1, B.me, bid) && A.chaseFleet(a2, B.me, bid));
  for (let i = 0; i < 40; i++) {
    clock.t += 1000;
    A.tick();
  }
  const looted = P(A).fleets.reduce((t, f) => t + (f.cargo.minerals || 0), 0);
  assert.equal(looted, 900);
  assert.equal(P(A).effects.length, 1);
});

test('poursuite mutuelle livrée des deux côtés en même temps : les pertes ne comptent qu’une fois', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const fa = park(A, { fighter: 10 }, {}, { x: 4, y: 5 }, 300);
  const fb = park(B, { fighter: 10 }, {}, { x: 6, y: 5 }, 300);
  sync(A, B);
  sync(B, A);
  A.chaseFleet(fa, B.me, fb);
  B.chaseFleet(fb, A.me, fa);
  sync(A, B);
  sync(B, A);
  for (let i = 0; i < 60; i++) {
    clock.t += 1000;
    A.tick();
    B.tick();
    if (i % 5 === 4) {
      sync(A, B);
      sync(B, A);
    }
  }
  for (const s of [A, B]) assert.deepEqual(P(s).fleets.map((f) => f.ships), [{ fighter: 2 }], 'comme un seul combat 10 contre 10');
});

test('flotte rattrapée juste après avoir fondé sa colonie : la colonie encaisse les pertes', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const w = A.planets[5];
  const cell = { x: w.x, y: w.y };
  const bid = park(B, { colony: 1, cargo: 2 }, { minerals: 1200 }, cell, 100);
  B.moveFleet(bid, cell, 'colonize');
  sync(A, B);
  const aid = park(A, { fighter: 10, cargo: 3 }, {}, { x: cell.x + 1, y: cell.y }, 200);
  sync(B, A);
  clock.t += 1000;
  B.tick();
  assert.ok(P(B).colonies[w.id], 'colonie fondée');
  A.chaseFleet(aid, B.me, bid);
  for (let i = 0; i < 10; i++) {
    clock.t += 1000;
    A.tick();
  }
  sync(B, A);
  clock.t += 1000;
  B.tick();
  const loot = A.myFleet(aid).cargo.minerals;
  assert.ok(loot + P(B).colonies[w.id].stock.minerals <= 1200 + 50, 'pas de minéraux en double');
});

test('colonisation : le premier arrivé l’emporte, même si son téléphone passe après', () => {
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
  clock.t += 30_000;
  B.tick(); // B passe le premier…
  sync(A, B);
  A.tick(); // … mais A était arrivé 20 s avant
  sync(B, A);
  B.tick();
  sync(A, B);
  A.tick();
  assert.equal(A.ownerAt(w)?.id, A.me);
  assert.equal(B.ownerAt(w)?.id, A.me);
  assert.ok(P(A).colonies[w.id] && !P(B).colonies[w.id]);
});

test('flotte en panne à moins d’une demi-case de sa planète : elle peut faire le plein', () => {
  const { players: [A] } = newGame(2, ['human', 'human']);
  const home = P(A).home;
  const id = park(A, { fighter: 2 }, {}, { x: home.x + 0.3, y: home.y }, 0);
  Object.assign(A.myFleet(id), { stranded: true });
  assert.ok(A.refuelFleet(id));
});

test('plusieurs attaquants qui se voient ne pillent pas plus que le stock du défenseur', () => {
  const { players, clock, sync } = newGame(4, ['human', 'machine', 'alien', 'human']);
  const D = players[3];
  const dp = P(D).planet;
  Object.assign(dp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  dp.levels.store = 3;
  D.touch();
  for (const s of players) if (s !== D) sync(s, D);
  const cell = { ...P(D).home };
  const raiders = players.slice(0, 3);
  for (const s of raiders) {
    const id = park(s, { heavy: 6, cargo: 10 }, {}, cell, 500);
    clock.t += 10;
    s.moveFleet(id, cell, 'attack');
    clock.t += 1000;
    s.tick();
    for (const o of raiders) if (o !== s) sync(o, s); // les attaquants se voient entre eux
  }
  const looted = raiders.reduce((t, s) => t + (P(s).fleets[0]?.cargo?.minerals || 0), 0);
  assert.ok(looted <= 4000 + 1, `pillé ${looted} pour un stock de 4000`);
});

test('une revanche plus tard entre les deux mêmes flottes est un vrai combat', () => {
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
  assert.ok(B.chaseFleet(fb, A.me, fa)); // combat 1 : B attaque
  for (let i = 0; i < 20; i++) both(); // rapport lu puis effacé partout
  const before = countAll(B);
  assert.ok(A.chaseFleet(fa, B.me, fb)); // revanche : A attaque
  const lost = Object.values(P(A).effects.at(-1).ships).reduce((a, b) => a + b, 0);
  for (let i = 0; i < 20; i++) both();
  assert.ok(lost > 0);
  assert.equal(before - countAll(B), lost, 'B subit les pertes de la revanche');
});

/** Vaisseaux de toutes les flottes d'un joueur. */
const countAll = (s) => P(s).fleets.reduce((t, f) => t + Object.values(f.ships).reduce((a, b) => a + b, 0), 0);

test('raids : pas d’attaque sans armes, et un seul pillage par planète toutes les 2 min', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const bp = P(B).planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 2000, energy: 500 }, ships: {} });
  bp.levels.store = 3;
  B.touch();
  sync(A, B);
  const cell = { ...P(B).home };
  const cargo = park(A, { cargo: 5 }, {}, cell, 200);
  assert.equal(A.moveFleet(cargo, cell, 'attack'), false, 'des cargos seuls ne peuvent pas attaquer');
  P(A).planet.ships = { fighter: 6, cargo: 10 };
  const id = A.takeOff('home', { fighter: 6, cargo: 10 }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 500 });
  const looted = () => Object.values(A.myFleet(id).cargo).reduce((a, b) => a + b, 0);
  for (let i = 0; i < 5; i++) {
    A.moveFleet(id, cell, 'attack');
    clock.t += 1000;
    A.tick();
  }
  const once = looted();
  assert.ok(once > 0 && once <= 3000, `un seul pillage en 5 s (${once})`);
  clock.t += 3 * 60_000;
  A.moveFleet(id, cell, 'attack');
  clock.t += 1000;
  A.tick();
  assert.ok(looted() > once, 'un nouveau pillage après 2 min');
});
