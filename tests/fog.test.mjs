// Brouillard sur les planètes (D-124) : hors de ma portée, la planète d'un
// autre paraît libre ; une fois vue, je retiens à qui elle est, même quand
// elle sort de ma portée, jusqu'à la revoir.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { loadGame } = await import('../js/save.js');
const scenario = scenarios(import.meta.url);

scenario('planète ennemie : invisible, puis retenue une fois vue', (film) => {
  const { players: [A, B], clock } = newGame(2);
  const home = A.state.players[B.me].home;
  const far = [{ x: home.x + 50, y: home.y + 50, r: 1 }];
  const near = [{ x: home.x + 1, y: home.y, r: 2 }];

  A.eyes = () => far;
  film.look(A, 'la planète de B, loin des yeux de A : jamais vue');
  assert.equal(A.knownOwner(home).owner, null, 'jamais vue : elle paraît libre');

  A.eyes = () => near;
  clock.t += 1000;
  film.look(A, 'A voit la planète de B');
  const seen = A.knownOwner(home);
  assert.equal(seen.owner?.id, B.me);
  assert.equal(seen.live, true);

  A.eyes = () => far;
  clock.t += 60_000;
  film.look(A, 'une minute plus tard, hors de vue : A se souvient');
  const memo = A.knownOwner(home);
  assert.equal(memo.owner?.id, B.me, 'hors de portée : je me souviens de son propriétaire');
  assert.equal(memo.live, false);
  assert.equal(memo.at, clock.t - 60_000, 'avec l’heure où je l’ai vue');

  // Elle change de mains hors de ma vue : mon souvenir reste l'ancien.
  A.state.players[B.me].home = { x: -99, y: -99 };
  film.look(A, 'B quitte la planète hors de la vue de A');
  assert.equal(A.knownOwner(home).owner?.id, B.me);

  // Revue : libre, le souvenir s'efface.
  A.eyes = () => near;
  film.look(A, 'A la revoit : libre');
  assert.equal(A.knownOwner(home).owner, null);
  A.eyes = () => far;
  assert.equal(A.knownOwner(home).owner, null);
});

scenario('mes planètes sont toujours visibles', (film) => {
  const { players: [A] } = newGame(2);
  A.eyes = () => [];
  film.look(A, 'A sans aucun œil');
  assert.equal(A.knownOwner(A.state.players[A.me].home).owner?.id, A.me);
});

scenario('le passage (tick) découvre les planètes à portée, et le souvenir est sauvegardé', (film) => {
  const { players: [A, B] } = newGame(2);
  const home = A.state.players[B.me].home;
  A.eyes = () => [{ x: home.x, y: home.y, r: 1 }];
  A.tick();
  film.look(A, 'un passage avec la planète de B à portée');
  assert.equal(A.intel[`${home.x},${home.y}`]?.pid, B.me);
  A.save();
  const saved = loadGame();
  assert.equal(saved.intel[`${home.x},${home.y}`]?.pid, B.me);
});
