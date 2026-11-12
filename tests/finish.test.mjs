// Écran « Fin de partie » (D-143) : le classement final, avec les médailles or, argent et
// bronze aux trois premiers, mon joueur repéré ; seul et éliminé, pas de médaille (D-142).
import { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { finalBoard } = await import('../js/finish.js');
const scenario = scenarios(import.meta.url);

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

const me = (s) => s.state.players[s.me];

scenario('fin à quatre : le classement dans l’ordre, or, argent, bronze, et moi repéré', (film) => {
  const { players, clock, sync } = newGame(4, ['human', 'machine', 'alien', 'human']);
  const [A, B, C, D] = players;
  // Le froid prend D, puis C, puis B ; A reste le dernier en vie.
  const t0 = clock.t;
  const falls = { [D.me]: t0 + 60_000, [C.me]: t0 + 120_000, [B.me]: t0 + 180_000, [A.me]: Infinity };
  const homes = players.map((s) => ({ cell: { ...me(s).home }, at: falls[s.me] }));
  const frostOf = (cell) => homes.find((h) => game.sameCell(h.cell, cell))?.at ?? Infinity;
  for (const s of players) s.frostOf = frostOf;
  film.look(B, 'quatre joueurs ; le froid va prendre D, puis C, puis B');
  assert.equal(finalBoard(B), null, 'pas d’écran de fin tant que la partie continue');
  clock.t = t0 + 180_000 + 1;
  for (const s of players) s.tick();
  for (const a of players) for (const b of players) if (a !== b) sync(a, b);
  A.tick();
  for (const s of players) sync(s, A);
  const board = finalBoard(B);
  const L = { [A.me]: 'A', [B.me]: 'B', [C.me]: 'C', [D.me]: 'D' };
  film.look(B, 'B, C et D ont gelé : A gagne, B voit l’écran de fin', [
    { show: 'classement', expected: ['A', 'B', 'C', 'D'], got: board?.rows.map((r) => L[r.id]) },
    { show: 'médailles', expected: ['gold', 'silver', 'bronze', null], got: board?.rows.map((r) => r.medal) },
    { show: 'moi (B) repéré', expected: [false, true, false, false], got: board?.rows.map((r) => r.me) },
    ...players.map((s) => ({ show: `points de ${L[s.me]}`, at: me(s).home, expected: 'plus de 0', got: Math.round(board?.rows.find((r) => r.id === s.me)?.pts || 0), ok: board?.rows.find((r) => r.id === s.me)?.pts > 0 })),
  ]);
  assert.equal(B.over?.winner, A.me);
  assert.deepEqual(board.rows.map((r) => r.id), [A.me, B.me, C.me, D.me], 'le dernier en vie, puis les derniers tombés');
  assert.deepEqual(board.rows.map((r) => r.medal), ['gold', 'silver', 'bronze', null], 'or, argent, bronze, puis rien');
  assert.deepEqual(board.rows.map((r) => r.place), [1, 2, 3, 4]);
  assert.deepEqual(board.rows.map((r) => r.me), [false, true, false, false], 'B se repère dans la liste');
  assert.deepEqual(board.rows.map((r) => r.dead), [false, true, true, true]);
  assert.ok(board.rows.slice(1).every((r) => r.pts > 0), 'un joueur tombé garde ses points d’avant la chute');
  assert.equal(finalBoard(A).rows[0].me, true, 'A, le gagnant, se voit en tête');
});

scenario('fin seul : pas de médaille, je ne suis pas le gagnant', (film) => {
  Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
  const { players: [A], clock } = newGame(1, ['human']);
  clock.t = A.frostOf(me(A).home) + 1;
  A.tick();
  const board = finalBoard(A);
  film.look(A, 'A, seul, a tout perdu : la partie est finie, sans médaille', [
    { show: 'gagnant', expected: null, got: A.over?.winner },
    { show: 'médaille de A', expected: null, got: board.rows[0]?.medal },
    { show: 'A repéré, tombé', expected: { me: true, dead: true }, got: { me: board.rows[0]?.me, dead: board.rows[0]?.dead } },
  ]);
  assert.equal(A.over.winner, null, 'personne ne gagne');
  assert.equal(board.rows.length, 1);
  assert.equal(board.rows[0].medal, null, 'pas de médaille d’or pour une défaite');
  assert.equal(board.rows[0].me, true);
  assert.equal(board.rows[0].dead, true);
});

/** Une flotte de `s` en orbite de la case `cell`, prête à recevoir un ordre. */
function inOrbit(s, cell, ships) {
  me(s).planet.ships = { ...ships };
  const id = s.takeOff('home', { ...ships }, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  return id;
}

/** Le tableau de fin, en lignes courtes « lettre médaille points » : pour comparer deux téléphones. */
const rowsOf = (s, L) => finalBoard(s)?.rows.map((r) => `${L[r.id]} ${r.medal || '-'} ${r.pts}`);

/** C, hors ligne, revient : il lit les fiches de A et B, joue son tour, et les autres lisent la sienne. */
function comeBack(C, others, clock, sync) {
  clock.t += 60_000;
  for (const s of others) sync(C, s);
  C.tick();
  for (const s of others) sync(s, C);
  for (const s of others) s.tick();
}

scenario('#77 : C pris hors ligne avant B : C après B, même heure de mort partout, avant et après son retour', (film) => {
  const { players: [A, B, C], clock, sync } = newGame(3, ['human', 'machine', 'alien']);
  const L = { [A.me]: 'A', [B.me]: 'B', [C.me]: 'C' };
  // C a plus de points que B : une grosse flotte au loin. Puis il ferme l'appli.
  me(C).planet.ships = { fighter: 200 };
  C.takeOff('home', { fighter: 200 }, {}, 0);
  for (const s of [A, B]) sync(s, C);
  const homeB = { ...me(B).home };
  const homeC = { ...me(C).home };
  // t1 : A prend la planète mère de C (sa dernière planète).
  const f1 = inOrbit(A, homeC, { fighter: 30 });
  clock.t += 1000;
  A.moveFleet(f1, homeC, 'conquer');
  A.tick();
  const t1 = me(A).effects.find((e) => e.capture && e.to === C.me).at;
  sync(B, A);
  B.tick();
  // t2, 5 min plus tard : A prend la planète mère de B (en ligne). Fin, A gagne.
  clock.t += 5 * 60_000;
  const f2 = inOrbit(A, homeB, { fighter: 30 });
  clock.t += 1000;
  A.moveFleet(f2, homeB, 'conquer');
  A.tick();
  const t2 = me(A).effects.find((e) => e.capture && e.to === B.me).at;
  sync(B, A);
  B.tick();
  sync(A, B);
  A.tick();
  sync(B, A);
  const cAt = (s) => s.deadAt(s.state.players[C.me]);
  const before = { A: rowsOf(A, L), B: rowsOf(B, L) };
  const expected = ['A gold 126', 'B silver 1', 'C bronze 681'];
  film.look(B, 'C, hors ligne, a été pris à t1 ; B est tombé 5 min plus tard : B voit l’écran de fin', [
    { show: 'classement chez B', expected, got: before.B },
    { show: 'classement chez A', expected, got: before.A },
    { show: 'mort de C chez A et B (min après t1)', expected: [0, 0], got: [A, B].map((s) => (cAt(s) - t1) / 60_000) },
    { show: 'fin de partie à la chute de B', at: homeB, expected: t2, got: B.over?.at },
  ]);
  assert.deepEqual(before.B, expected, 'A, puis B (tombé à t2), puis C (tombé à t1)');
  assert.deepEqual(before.A, before.B, 'le même classement sur les deux téléphones');
  for (const s of [A, B]) assert.equal(cAt(s), t1, `mort de C à l’heure du rapport capture, vu par ${L[s.me]}`);
  assert.equal(B.over.at, t2);
  // C rouvre l'appli : il lit le rapport de A et écrit sa chute.
  comeBack(C, [A, B], clock, sync);
  const after = { A: rowsOf(A, L), B: rowsOf(B, L), C: rowsOf(C, L) };
  film.look(C, 'C rouvre l’appli : le classement n’a pas bougé, sur aucun téléphone', [
    { show: 'classement chez B', expected, got: after.B },
    { show: 'classement chez A', expected, got: after.A },
    { show: 'classement chez C', expected, got: after.C },
    { show: 'mort de C (min après t1) chez A, B, C', expected: [0, 0, 0], got: [A, B, C].map((s) => (cAt(s) - t1) / 60_000) },
    { show: 'C a écrit sa chute (out)', expected: t1, got: me(C).out },
  ]);
  for (const s of [A, B, C]) assert.deepEqual(rowsOf(s, L), expected, `même écran de fin chez ${L[s.me]} après le retour de C`);
  for (const s of [A, B, C]) assert.equal(cAt(s), t1);
  assert.equal(me(C).out, t1);
});

scenario('#77 : C perd une colonie puis sa planète mère, hors ligne, à la même heure que B : ses points d’avant la chute, les mêmes avant et après son retour', (film) => {
  const { players: [A, B, C], clock, sync } = newGame(3, ['human', 'machine', 'alien']);
  const L = { [A.me]: 'A', [B.me]: 'B', [C.me]: 'C' };
  // C a une colonie riche (un sanctuaire niveau 6) : c'est elle qui lui donne ses points.
  const w = C.planets[7];
  me(C).colonies = { [w.id]: { ...game.newPlanet('alien', clock.t - 500, w), claimAt: clock.t - 500, levels: { sanctuary: 6 } } };
  C.touch();
  for (const s of [A, B]) sync(s, C);
  const colC = { x: w.x, y: w.y };
  const homeB = { ...me(B).home };
  const homeC = { ...me(C).home };
  const rich = A.scoreOf(A.state.players[C.me]);
  // t0 : A prend la colonie de C. Une minute plus tard, en même temps, les planètes mères de C et de B.
  const f0 = inOrbit(A, colC, { fighter: 30 });
  clock.t += 1000;
  A.moveFleet(f0, colC, 'conquer');
  A.tick();
  clock.t += 60_000;
  const f1 = inOrbit(A, homeC, { fighter: 30 });
  const f2 = inOrbit(A, homeB, { fighter: 30 });
  clock.t += 1000;
  A.moveFleet(f1, homeC, 'conquer');
  A.moveFleet(f2, homeB, 'conquer');
  A.tick();
  const t = clock.t;
  sync(B, A);
  B.tick();
  sync(A, B);
  A.tick();
  sync(B, A);
  const pC = (s) => s.ranking(s.over.at).find((r) => r.id === C.me);
  const before = { A: rowsOf(A, L), B: rowsOf(B, L) };
  film.look(B, 'C, hors ligne, a perdu sa colonie, puis sa planète mère en même temps que B', [
    { show: 'score de C avec sa colonie', at: colC, expected: 'plus que B', got: rich, ok: rich > 1 },
    { show: 'C et B tombés à la même heure', expected: [t, t], got: [B.deadAt(B.state.players[C.me]), B.deadAt(me(B))] },
    { show: 'points de C d’avant la chute (sans la colonie, perdue avant)', expected: 1, got: pC(B).best },
    { show: 'classement chez B', expected: ['A gold 188', 'B silver 1', 'C bronze 1'], got: before.B },
  ]);
  assert.ok(rich > 1, 'sa colonie compte encore dans sa fiche, que C n’a pas mise à jour');
  assert.equal(pC(B).best, 1, 'la colonie perdue avant la chute ne compte pas');
  assert.deepEqual(before.A, before.B);
  comeBack(C, [A, B], clock, sync);
  film.look(C, 'C rouvre l’appli : mêmes points, mêmes médailles', [
    { show: 'points de C écrits par C (deathPts)', expected: 1, got: me(C).deathPts },
    { show: 'classement chez B', expected: before.B, got: rowsOf(B, L) },
    { show: 'classement chez C', expected: before.B, got: rowsOf(C, L) },
  ]);
  assert.equal(me(C).deathPts, pC(B).best, 'C écrit les points que les autres avaient déjà calculés');
  for (const s of [A, B, C]) assert.deepEqual(rowsOf(s, L), before.B, `même écran de fin chez ${L[s.me]}`);
});

/** Quatre joueurs dont le froid prend les planètes mères aux heures `at` (ms après t0) ; tout le monde se lit. */
function frozenFour(at) {
  const { players, clock, sync } = newGame(4, ['human', 'machine', 'alien', 'human']);
  const t0 = clock.t;
  const homes = players.map((s, i) => ({ cell: { ...me(s).home }, at: t0 + at[i] }));
  const frostOf = (cell) => homes.find((h) => game.sameCell(h.cell, cell))?.at ?? Infinity;
  for (const s of players) s.frostOf = frostOf;
  clock.t = t0 + Math.max(...at.filter(Number.isFinite)) + 1;
  for (const s of players) s.tick();
  for (let k = 0; k < 2; k++) {
    for (const a of players) for (const b of players) if (a !== b) sync(a, b);
    for (const s of players) s.tick();
  }
  return players;
}

scenario('#79 : la fin écrite nomme un gagnant que le classement ne met pas devant : il est 1er, en or, comme dans le bandeau', (film) => {
  const players = frozenFour([Infinity, 180_000, 120_000, 60_000]);
  const [A, B, C, D] = players;
  const L = { [A.me]: 'A', [B.me]: 'B', [C.me]: 'C', [D.me]: 'D' };
  assert.equal(B.over?.winner, A.me);
  // La fin a été décidée sur une vue périmée (code-fin-04) : chaque fiche dit « C gagne ».
  for (const s of players) for (const p of Object.values(s.state.players)) if (p.over) p.over = { ...p.over, winner: C.me };
  const board = finalBoard(B);
  film.look(B, 'les fiches disent « C gagne » ; le classement met A (en vie) devant', [
    { show: 'gagnant du bandeau', expected: 'C', got: L[B.over?.winner] },
    { show: 'ordre du classement (ranking)', expected: ['A', 'B', 'C', 'D'], got: B.ranking(B.over.at).map((r) => L[r.id]) },
    { show: 'écran de fin', expected: ['C', 'A', 'B', 'D'], got: board.rows.map((r) => L[r.id]) },
    { show: 'médailles', expected: ['gold', 'silver', 'bronze', null], got: board.rows.map((r) => r.medal) },
  ]);
  assert.equal(board.rows[0].id, B.over.winner, 'le 1er de l’écran de fin est le gagnant du bandeau');
  assert.deepEqual(board.rows.map((r) => r.id), [C.me, A.me, B.me, D.me], 'le gagnant, puis l’ordre du classement');
  assert.deepEqual(board.rows.map((r) => r.medal), ['gold', 'silver', 'bronze', null]);
  assert.deepEqual(board.rows.map((r) => r.place), [1, 2, 3, 4]);
  assert.deepEqual(board.rows.map((r) => r.winner), [true, false, false, false]);
  assert.ok(!/éliminé/.test(board.rows[0].status), 'le gagnant n’est pas « éliminé »');
});

scenario('#79 : le froid prend tout le monde : le dernier tombé gagne, sa ligne dit « gagne », pas « éliminé »', (film) => {
  const players = frozenFour([240_000, 180_000, 120_000, 60_000]);
  const [A, B, C, D] = players;
  const L = { [A.me]: 'A', [B.me]: 'B', [C.me]: 'C', [D.me]: 'D' };
  const board = finalBoard(B);
  film.look(B, 'tout a gelé ; A, tombé en dernier, gagne', [
    { show: 'gagnant', expected: 'A', got: L[B.over?.winner] },
    { show: 'classement', expected: ['A', 'B', 'C', 'D'], got: board?.rows.map((r) => L[r.id]) },
    { show: 'tous tombés', expected: [true, true, true, true], got: board?.rows.map((r) => r.dead) },
    { show: 'textes sous les noms', expected: ['tombé en dernier · gagne', 'éliminé', 'éliminé', 'éliminé'], got: board?.rows.map((r) => r.status) },
  ]);
  assert.equal(B.over.winner, A.me);
  assert.equal(board.rows[0].id, B.over.winner);
  assert.deepEqual(board.rows.map((r) => r.dead), [true, true, true, true]);
  assert.deepEqual(board.rows.map((r) => r.winner), [true, false, false, false], 'la ligne du gagnant se distingue');
  assert.deepEqual(board.rows.map((r) => r.status), ['tombé en dernier · gagne', 'éliminé', 'éliminé', 'éliminé']);
  assert.equal(board.rows[0].medal, 'gold');
});
