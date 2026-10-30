// Alerte de flotte ennemie (D-115) : ce que Session.threats signale au
// défenseur, et ce qu'elle tait (flottes sans armes, hors de vue, les miennes).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';

const P = (s) => s.state.players[s.me];

/** Une flotte de `s`, arrêtée en `at`, le plein fait. */
function park(s, ships, at) {
  const pl = P(s).planet;
  pl.ships = { ...ships };
  pl.stock = { ...pl.stock, energy: 5000 };
  const id = s.takeOff('home', ships, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel: 1000 });
  s.touch();
  return id;
}

test('une flotte armée qui vise ma planète : alerte avec compte à rebours', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const home = P(A).home;
  sync(B, A);
  const bid = park(B, { fighter: 4 }, { x: home.x + 2, y: home.y });
  assert.ok(B.moveFleet(bid, home, 'conquer'));
  sync(A, B);
  const [t, ...rest] = A.threats(clock.t);
  assert.equal(rest.length, 0);
  assert.equal(t.p.id, B.me);
  assert.equal(t.target.key, 'home');
  assert.equal(t.n, 4);
  assert.ok(t.eta > 0, 'compte à rebours avant l’impact');
  clock.t += t.eta + 5_000;
  assert.equal(A.threats(clock.t)[0].eta, 0, 'arrivée pas encore réglée : l’alerte reste, à 0 s');
});

test('une flotte armée visible qui ne vise rien : signalée, sans compte à rebours, après les menaces directes', () => {
  const { players: [A, B, C], clock, sync } = newGame(3, ['human', 'human', 'human']);
  const home = P(A).home;
  sync(B, A);
  park(C, { fighter: 1 }, { x: home.x + 1, y: home.y }); // juste à côté, mais ne vise rien
  const bid = park(B, { fighter: 2 }, { x: home.x - 2, y: home.y });
  B.moveFleet(bid, home, 'attack');
  sync(A, B);
  sync(A, C);
  const list = A.threats(clock.t);
  assert.deepEqual(list.map((t) => t.p.id), [B.me, C.me]);
  assert.equal(list[1].eta, null);
  assert.equal(list[1].dist, 1);
});

test('pas d’alerte pour une flotte sans armes, hors de vue, ou à moi', () => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  const home = P(A).home;
  park(A, { fighter: 3 }, { x: home.x + 1, y: home.y });
  park(B, { cargo: 2 }, { x: home.x + 1, y: home.y + 1 });
  sync(A, B);
  P(B).planet.ships = { fighter: 2 };
  const far = B.takeOff('home', { fighter: 2 }, {}, 0); // loin, sur la planète de B
  B.touch();
  sync(A, B);
  assert.ok(B.myFleet(far));
  assert.deepEqual(A.threats(clock.t), []);
});
