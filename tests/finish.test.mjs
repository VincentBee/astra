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
