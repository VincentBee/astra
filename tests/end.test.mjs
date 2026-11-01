// Fin de partie : le froid part du bord et se resserre vers le soleil ; une
// planète qu'il atteint est perdue, une planète peut aussi être conquise.
// Sans planète, on est éliminé ; le dernier joueur en vie gagne.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, fleet } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

/** Froid actif : il part tout de suite et atteint le soleil en 10 min. */
const frost = () => Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
const me = (s) => s.state.players[s.me];

scenario('le score compte toutes les planètes, les recherches et les vaisseaux', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const p = me(A);
  film.look(A, 'A sur sa planète mère, sans plus');
  const before = A.scoreOf(p);
  p.planet.ships = { ...(p.planet.ships || {}), fighter: 10 };
  const withShips = A.scoreOf(p);
  film.look(A, '10 frégates à quai en plus');
  assert.ok(withShips > before, 'les vaisseaux comptent');
  p.colonies = { [A.planets[5].id]: { ...p.planet, levels: { mine: 3 }, ships: {} } };
  film.look(A, 'et une colonie');
  assert.ok(A.scoreOf(p) > withShips, 'les colonies comptent');
});

scenario('le froid prend d’abord les planètes loin du soleil, puis les plus proches', (film) => {
  frost();
  const { players: [A] } = newGame(1, ['human']);
  film.look(A, 'le froid part du bord, vers le soleil');
  const at = A.planets.slice(0, 14).map((w) => A.frostOf(w));
  const near = A.planets.slice(0, 14).sort((a, b) => A.frostOf(b) - A.frostOf(a))[0];
  const far = A.planets.slice(0, 14).sort((a, b) => A.frostOf(a) - A.frostOf(b))[0];
  assert.ok(A.frostOf(far) < A.frostOf(near));
  assert.ok(Math.max(...at) <= A.startedAt + 10 * 60_000);
});

scenario('planète mère gelée : la plus vieille colonie en vie la remplace, puis élimination', (film) => {
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
  film.look(A, 'A : sa planète mère et deux colonies');
  clock.t = Math.max(A.frostOf(outer), A.frostOf(home)) + 1;
  A.tick();
  film.look(A, 'la planète mère et la colonie du bord ont gelé');
  assert.ok(game.sameCell(p.home, inner), 'la colonie la plus au chaud devient planète mère');
  assert.deepEqual(Object.keys(p.colonies), []);
  assert.equal(A.over, null);
  clock.t = A.frostOf(inner) + 1;
  A.tick();
  film.look(A, 'la dernière colonie gèle : A est éliminé');
  assert.equal(p.out, A.frostOf(inner), 'éliminé à l’heure où le froid a pris sa dernière planète');
  assert.equal(A.over?.winner, A.me, 'seul : la partie finit quand le froid a tout pris');
});

scenario('à deux, celui que le froid prend en dernier gagne, même si l’autre est hors ligne', (film) => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const [first, last] = A.frostOf(me(A).home) < A.frostOf(me(B).home) ? [A, B] : [B, A];
  film.look(last, 'deux joueurs, le froid arrive');
  clock.t = first.frostOf(me(first).home) + 1;
  last.tick(); // le perdant n'a pas rouvert l'appli : le gagnant voit quand même qu'il a tout perdu
  film.look(last, 'la planète de l’autre a gelé : il gagne');
  assert.equal(last.over?.winner, last.me);
  sync(first, last);
  film.look(first, 'le perdant reçoit la fin de partie');
  assert.equal(first.over?.winner, last.me, 'la fin se propage');
  const levels = JSON.stringify(me(first).planet.levels);
  first.build('mine');
  assert.equal(JSON.stringify(me(first).planet.levels), levels, 'plus d’ordres après la fin');
});

/** A envoie `ships` conquérir (ou attaquer) la planète mère de B, déjà en orbite ; B a les bâtiments `defense` en plus. */
function assault(kind, ships, defense = {}, film) {
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
  film?.look(A, `la flotte de A en orbite de la planète mère de B (ordre : ${kind})`);
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

scenario('conquérir la planète mère d’un joueur sans colonie l’élimine', (film) => {
  const { A, B, clock, sync, cell, id } = assault('conquer', { fighter: 30 }, {}, film);
  film.look(A, 'combat : A a pris la planète');
  assert.equal(A.ownerAt(cell)?.id, A.me, 'la planète est à A avant même que B lise le rapport');
  assert.equal(Object.values(me(A).colonies || {}).length, 1, 'A y a une colonie');
  assert.equal(A.myFleet(id), null, 'la flotte s’y est posée');
  sync(B, A);
  clock.t += 1000;
  B.tick();
  film.look(B, 'B lit le rapport : il n’a plus de planète');
  assert.equal(me(B).home, null);
  assert.ok(Number.isFinite(me(B).out), 'B est éliminé');
  sync(A, B);
  clock.t += 1000;
  A.tick();
  film.look(A, 'A apprend que B est éliminé : il gagne');
  assert.equal(A.over?.winner, A.me);
  assert.equal(A.ownerAt(cell)?.id, A.me);
});

scenario('trop peu de vaisseaux d’attaque : les tourelles tiennent, ni prise ni pillage', (film) => {
  const { A, B, cell, id } = assault('conquer', { fighter: 3 }, { turret: 3 }, film);
  film.look(A, 'combat : les tourelles de B tiennent');
  assert.equal(A.ownerAt(cell)?.id, B.me);
  assert.ok((A.myFleet(id)?.ships.fighter || 0) < 3, 'les tourelles ont abattu des frégates');
  assert.equal(me(A).effects.at(-1).take.minerals ?? 0, 0, 'rien de pillé');
});

scenario('un colonisateur ne prend pas une planète habitée, une attaque pille sans prendre', (film) => {
  const colo = assault('conquer', { colony: 1 }, {}, film);
  film.look(colo.A, 'un colonisateur seul : la planète reste à B');
  assert.equal(colo.A.ownerAt(colo.cell)?.id, colo.B.me, 'pas d’armes : pas de conquête');
  const raid = assault('attack', { fighter: 30 }, {}, film);
  film.look(raid.A, 'attaque : B est pillé, mais garde sa planète');
  assert.equal(raid.A.ownerAt(raid.cell)?.id, raid.B.me, 'l’ordre « attaquer » ne prend pas la planète');
});

scenario('une partie d’avant la course n’a ni froid ni fin', (film) => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  delete me(A).since; // fiche d'avant la course
  film.look(A, 'fiche d’avant la course');
  clock.t += 60 * 60_000;
  A.tick();
  film.look(A, 'une heure plus tard : rien n’a gelé');
  assert.equal(A.over, null);
  assert.equal(A.startedAt, null);
  assert.ok(me(A).home, 'la planète mère n’a pas gelé');
});

scenario('mort simultanée : le meilleur score d’avant la chute gagne, les points tombent à 0', (film) => {
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
  film.look(A, 'B a une colonie, A une planète mère plus riche');
  const rich = B.scoreOf(me(B));
  assert.ok(rich > A.scoreOf(me(A)), 'B mène');
  assert.ok(game.empireScore('machine', [me(B).planet]) < A.scoreOf(me(A)), 'sa planète mère seule ne suffit pas');
  clock.t = T + 1;
  A.tick(); // A voit sa chute, et la fiche de B pas encore à jour
  film.look(A, 'tout l’anneau gèle : A voit sa chute');
  assert.equal(A.scoreOf(me(A)), 0, 'A a tout perdu : 0 point');
  assert.equal(A.over?.winner, B.me);
  B.tick();
  film.look(B, 'B tombe aussi');
  assert.equal(B.scoreOf(me(B)), 0, 'B aussi');
  assert.equal(me(B).deathPts, rich, 'B garde ses points d’avant la chute');
  sync(A, B);
  sync(B, A);
  film.look(B, 'fiches échangées : B gagne aux points d’avant la chute');
  assert.equal(B.over?.winner, B.me);
  assert.equal(A.over?.winner, B.me);
});
