// Fin de partie : le froid part du bord et se resserre vers le soleil ; une
// planète qu'il atteint est perdue, une planète peut aussi être conquise.
// Sans planète, on est éliminé ; le dernier joueur en vie gagne.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, fleet } from './harness.mjs';

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

/** Froid actif : il part tout de suite et atteint le soleil en 10 min. */
const frost = () => Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
const me = (s) => s.state.players[s.me];

test('le score compte toutes les planètes, les recherches et les vaisseaux', () => {
  const { players: [A] } = newGame(1, ['human']);
  const p = me(A);
  const before = A.scoreOf(p);
  p.planet.ships = { ...(p.planet.ships || {}), fighter: 10 };
  const withShips = A.scoreOf(p);
  assert.ok(withShips > before, 'les vaisseaux comptent');
  p.colonies = { [A.planets[5].id]: { ...p.planet, levels: { mine: 3 }, ships: {} } };
  assert.ok(A.scoreOf(p) > withShips, 'les colonies comptent');
});

test('le froid prend d’abord les planètes loin du soleil, puis les plus proches', () => {
  frost();
  const { players: [A] } = newGame(1, ['human']);
  const at = A.planets.slice(0, 14).map((w) => A.frostOf(w));
  const near = A.planets.slice(0, 14).sort((a, b) => A.frostOf(b) - A.frostOf(a))[0];
  const far = A.planets.slice(0, 14).sort((a, b) => A.frostOf(a) - A.frostOf(b))[0];
  assert.ok(A.frostOf(far) < A.frostOf(near));
  assert.ok(Math.max(...at) <= A.startedAt + 10 * 60_000);
});

test('planète mère gelée : la plus vieille colonie en vie la remplace, puis élimination', () => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  const p = me(A);
  // Deux colonies : une plus près du soleil que la planète mère, une plus loin.
  const byFrost = A.planets.slice(0, 14).filter((w) => !game.sameCell(w, p.home)).sort((a, b) => A.frostOf(a) - A.frostOf(b));
  const outer = byFrost[0];
  const inner = byFrost[byFrost.length - 1];
  const colony = (w, t) => ({ ...game.newPlanet('human', t, w), claimAt: t });
  p.colonies = { [outer.id]: colony(outer, clock.t), [inner.id]: colony(inner, clock.t + 1) };
  const home = { ...p.home };
  clock.t = Math.max(A.frostOf(outer), A.frostOf(home)) + 1;
  A.tick();
  assert.ok(game.sameCell(p.home, inner), 'la colonie la plus au chaud devient planète mère');
  assert.deepEqual(Object.keys(p.colonies), []);
  assert.equal(A.over, null);
  clock.t = A.frostOf(inner) + 1;
  A.tick();
  assert.equal(p.out, A.frostOf(inner), 'éliminé à l’heure où le froid a pris sa dernière planète');
  assert.equal(A.over?.winner, A.me, 'seul : la partie finit quand le froid a tout pris');
});

test('à deux, celui que le froid prend en dernier gagne, même si l’autre est hors ligne', () => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const [first, last] = A.frostOf(me(A).home) < A.frostOf(me(B).home) ? [A, B] : [B, A];
  clock.t = first.frostOf(me(first).home) + 1;
  last.tick(); // le perdant n'a pas rouvert l'appli : le gagnant voit quand même qu'il a tout perdu
  assert.equal(last.over?.winner, last.me);
  sync(first, last);
  assert.equal(first.over?.winner, last.me, 'la fin se propage');
  const levels = JSON.stringify(me(first).planet.levels);
  first.build('mine');
  assert.equal(JSON.stringify(me(first).planet.levels), levels, 'plus d’ordres après la fin');
});

/** A envoie `ships` conquérir (ou attaquer) la planète mère de B, déjà en orbite ; B a les bâtiments `defense` en plus. */
function assault(kind, ships, defense = {}) {
  const g = newGame(2, ['human', 'machine']);
  const { players: [A, B], clock, sync } = g;
  const cell = { ...me(B).home };
  Object.assign(me(B).planet.levels, defense);
  B.touch();
  sync(A, B);
  me(A).planet.ships = { ...ships };
  const id = A.takeOff('home', { ...ships }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  A.moveFleet(id, cell, kind);
  A.tick();
  return { ...g, A, B, cell, id };
}

test('la défense d’une planète vient de ses bâtiments, et de sa race', () => {
  assert.deepEqual(game.fortOf('human', { mine: 2, cannon: 1, shield: 1 }), { attack: 2 * 2 + 12, hull: 2 * 20 + 40 + 150 });
  assert.deepEqual(game.fortOf('machine', { turret: 2 }), { attack: 36, hull: 30 });
  assert.deepEqual(game.fortOf('alien', { spines: 1, dome: 1 }, 5.7), { attack: 8 + 5, hull: 60 + 260 }, 'les épines mordent plus avec plus de psioniques');
  assert.deepEqual(game.fortOf('human', {}), { attack: 0, hull: 0 });
});

test('conquérir la planète mère d’un joueur sans colonie l’élimine', () => {
  const { A, B, clock, sync, cell, id } = assault('conquer', { fighter: 30 });
  assert.equal(A.ownerAt(cell)?.id, A.me, 'la planète est à A avant même que B lise le rapport');
  assert.equal(Object.values(me(A).colonies || {}).length, 1, 'A y a une colonie');
  assert.equal(A.myFleet(id), null, 'la flotte s’y est posée');
  sync(B, A);
  clock.t += 1000;
  B.tick();
  assert.equal(me(B).home, null);
  assert.ok(Number.isFinite(me(B).out), 'B est éliminé');
  sync(A, B);
  clock.t += 1000;
  A.tick();
  assert.equal(A.over?.winner, A.me);
  assert.equal(A.ownerAt(cell)?.id, A.me);
});

test('trop peu de vaisseaux d’attaque : les tourelles tiennent, ni prise ni pillage', () => {
  const { A, B, cell, id } = assault('conquer', { fighter: 3 }, { turret: 3 });
  assert.equal(A.ownerAt(cell)?.id, B.me);
  assert.ok((A.myFleet(id)?.ships.fighter || 0) < 3, 'les tourelles ont abattu des frégates');
  assert.equal(me(A).effects.at(-1).take.minerals ?? 0, 0, 'rien de pillé');
});

test('un colonisateur ne prend pas une planète habitée, une attaque pille sans prendre', () => {
  const colo = assault('conquer', { colony: 1 });
  assert.equal(colo.A.ownerAt(colo.cell)?.id, colo.B.me, 'pas d’armes : pas de conquête');
  const raid = assault('attack', { fighter: 30 });
  assert.equal(raid.A.ownerAt(raid.cell)?.id, raid.B.me, 'l’ordre « attaquer » ne prend pas la planète');
});

test('une partie d’avant la course n’a ni froid ni fin', () => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  delete me(A).since; // fiche d'avant la course
  clock.t += 60 * 60_000;
  A.tick();
  assert.equal(A.over, null);
  assert.equal(A.startedAt, null);
  assert.ok(me(A).home, 'la planète mère n’a pas gelé');
});

test('mort simultanée : le meilleur score d’avant la chute gagne, les points tombent à 0', () => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  // Tout l'anneau gèle à la même heure. B (p1, après A dans l'ordre des noms) est le plus riche,
  // mais grâce à sa colonie : sa planète mère seule vaut moins que celle de A.
  const T = clock.t + 60_000;
  for (const s of [A, B]) s.frostOf = () => T;
  Object.assign(me(A).planet.levels, { mine: 6 });
  me(B).colonies = { [B.planets[5].id]: { ...game.newPlanet('machine', clock.t, B.planets[5]), levels: { drill: 12 }, claimAt: clock.t } };
  B.touch();
  sync(A, B);
  const rich = B.scoreOf(me(B));
  assert.ok(rich > A.scoreOf(me(A)), 'B mène');
  assert.ok(game.empireScore('machine', [me(B).planet]) < A.scoreOf(me(A)), 'sa planète mère seule ne suffit pas');
  clock.t = T + 1;
  A.tick(); // A voit sa chute, et la fiche de B pas encore à jour
  assert.equal(A.scoreOf(me(A)), 0, 'A a tout perdu : 0 point');
  assert.equal(A.over?.winner, B.me);
  B.tick();
  assert.equal(B.scoreOf(me(B)), 0, 'B aussi');
  assert.equal(me(B).deathPts, rich, 'B garde ses points d’avant la chute');
  sync(A, B);
  sync(B, A);
  assert.equal(B.over?.winner, B.me);
  assert.equal(A.over?.winner, B.me);
});
