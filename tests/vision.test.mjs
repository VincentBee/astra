// Champ de vision des flottes (règles §8.6, D-030) : une flotte ennemie n'est
// visible que dans ma portée de détection, autour de mes planètes et de mes
// flottes ; les miennes le sont toujours. La carte ne dessine que les flottes
// pour lesquelles `sees` dit oui (`fleetSpots`, js/app.js) : ces tests
// vérifient la règle, pas le dessin du canvas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, fleet } from './harness.mjs';

const { sightRange } = await import('../js/tech.js');

const P = (s) => s.state.players[s.me];

/** Une flotte de `s`, arrêtée en `at`. */
function park(s, ships, at, fuel) {
  const pl = P(s).planet;
  pl.ships = { ...ships };
  pl.stock = { ...pl.stock, energy: 5000 };
  const id = s.takeOff('home', ships, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel });
  s.touch();
  return id;
}

/** La flotte `id` de `b`, telle que `a` la connaît. */
const theirs = (a, b, id) => a.state.players[b.me].fleets.find((f) => f.id === id);

/** `a` voit-il, en ce moment, la flotte `id` de `b` ? */
const sees = (a, b, id) => a.sees(a.state.players[b.me], theirs(a, b, id), a.now());

/**
 * Deux humains sans technologie ; A n'a que sa planète mère comme yeux.
 * `at(dx, dy)` : la case à dx, dy de la planète mère de A, du côté où la carte a la place.
 */
function duel() {
  const g = newGame(2, ['human', 'human']);
  const [A] = g.players;
  assert.equal((P(A).fleets || []).length, 0, 'A n’a pas de flotte au départ');
  const home = { ...P(A).home };
  const sx = home.x < game.UNIVERSE.w / 2 ? 1 : -1;
  const sy = home.y < game.UNIVERSE.h / 2 ? 1 : -1;
  return { ...g, at: (dx, dy = 0) => ({ x: home.x + sx * dx, y: home.y + sy * dy }) };
}

test('flotte ennemie près de ma planète : visible jusqu’à la portée, cachée au-delà', () => {
  const { players: [A, B], sync, at } = duel();
  const r = sightRange('human', {}, 'planet');

  const edge = park(B, { cargo: 1 }, at(r), 40);
  sync(A, B);
  assert.equal(sees(A, B, edge), true, `à ${r} cases : visible`);

  const beyond = park(B, { cargo: 1 }, at(r + 1), 40);
  sync(A, B);
  assert.equal(sees(A, B, beyond), false, `à ${r + 1} cases : cachée`);

  // Distance à vol d'oiseau, pas en cases : en diagonale, r cases en x et en y, c'est trop loin.
  const diag = park(B, { cargo: 1 }, at(r, r), 40);
  sync(A, B);
  assert.equal(sees(A, B, diag), false, 'en diagonale à r + r : cachée');

  // Filtre d'affichage, pas un secret : ma copie de la partie connaît quand même la flotte.
  assert.ok(theirs(A, B, beyond), 'la flotte cachée est dans la copie de A');
});

test('flotte ennemie près de ma flotte : visible dans la portée de ma flotte', () => {
  const { players: [A, B], sync, at } = duel();
  const r = sightRange('human', {}, 'fleet');
  const far = 8; // à 8 cases de la planète mère de A : hors de sa portée, même un peu à côté
  park(A, { fighter: 1 }, at(far), 40);

  const near = park(B, { cargo: 1 }, at(far, r), 40);
  const out = park(B, { cargo: 1 }, at(far, r + 1), 40);
  sync(A, B);
  assert.equal(sees(A, B, near), true, `à ${r} cases de ma flotte : visible`);
  assert.equal(sees(A, B, out), false, `à ${r + 1} cases : cachée`);
});

test('mes flottes sont toujours visibles, même loin de tout', () => {
  const { players: [A], at } = duel();
  const id = park(A, { fighter: 1 }, at(8, 8), 40);
  assert.equal(A.sees(P(A), A.myFleet(id), A.now(), []), true, 'sans aucun œil : la mienne reste visible');
});

test('une flotte ennemie en route disparaît en sortant de ma portée, et réapparaît en revenant', () => {
  const { players: [A, B], sync, clock, at } = duel();
  const r = sightRange('human', {}, 'planet');
  const inside = at(r - 1);
  const outside = at(r + 3);

  const id = park(B, { cargo: 1 }, inside, 40);
  sync(A, B);
  assert.equal(sees(A, B, id), true, 'au départ, dans ma portée');

  assert.equal(B.moveFleet(id, outside), true, 'départ accepté');
  sync(A, B);
  assert.equal(fleet.moving(theirs(A, B, id), clock.t), true, 'elle roule');
  clock.t = theirs(A, B, id).arrive;
  assert.equal(sees(A, B, id), false, 'arrivée hors de ma portée : cachée');

  assert.equal(B.moveFleet(id, inside), true, 'retour accepté');
  sync(A, B);
  clock.t = theirs(A, B, id).arrive;
  assert.equal(sees(A, B, id), true, 'revenue dans ma portée : visible');
});
