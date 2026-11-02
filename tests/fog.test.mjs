// Brouillard sur les planètes (D-124) : hors de ma portée, la planète d'un
// autre paraît libre ; une fois vue, je retiens à qui elle est, même quand
// elle sort de ma portée, jusqu'à la revoir.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { loadGame } = await import('../js/save.js');
const scenario = scenarios(import.meta.url);
/** À qui `s` croit que la planète `cell` appartient, en lettre (A, B) : pour les étiquettes. */
const who = (s, cell, A, B) => ({ [A.me]: 'A', [B.me]: 'B' })[s.knownOwner(cell).owner?.id] || 'personne';

scenario('planète ennemie : invisible, puis retenue une fois vue', (film) => {
  const { players: [A, B], clock } = newGame(2);
  const home = A.state.players[B.me].home;
  const far = [{ x: home.x + 50, y: home.y + 50, r: 1 }];
  const near = [{ x: home.x + 1, y: home.y, r: 2 }];

  A.eyes = () => far;
  film.look(A, 'la planète de B, loin des yeux de A : jamais vue, elle paraît libre', [{ show: 'à qui, pour A', at: home, expected: 'personne', got: who(A, home, A, B) }]);
  assert.equal(A.knownOwner(home).owner, null, 'jamais vue : elle paraît libre');

  A.eyes = () => near;
  clock.t += 1000;
  film.look(A, 'A voit la planète de B', [{ show: 'à qui, pour A', at: home, expected: 'B', got: who(A, home, A, B) }]);
  const seen = A.knownOwner(home);
  assert.equal(seen.owner?.id, B.me);
  assert.equal(seen.live, true);

  A.eyes = () => far;
  clock.t += 60_000;
  film.look(A, 'une minute plus tard, hors de vue : A se souvient', [
    { show: 'à qui, pour A', at: home, expected: 'B', got: who(A, home, A, B) },
    { show: 'vue il y a, en s', at: home, expected: 60, got: (clock.t - A.knownOwner(home).at) / 1000 },
  ]);
  const memo = A.knownOwner(home);
  assert.equal(memo.owner?.id, B.me, 'hors de portée : je me souviens de son propriétaire');
  assert.equal(memo.live, false);
  assert.equal(memo.at, clock.t - 60_000, 'avec l’heure où je l’ai vue');

  // Elle change de mains hors de ma vue : mon souvenir reste l'ancien.
  A.state.players[B.me].home = { x: -99, y: -99 };
  film.look(A, 'B quitte la planète hors de la vue de A : A croit encore qu’elle est à B', [{ show: 'à qui, pour A', at: home, expected: 'B', got: who(A, home, A, B) }]);
  assert.equal(A.knownOwner(home).owner?.id, B.me);

  // Revue : libre, le souvenir s'efface.
  A.eyes = () => near;
  film.look(A, 'A la revoit : libre', [{ show: 'à qui, pour A', at: home, expected: 'personne', got: who(A, home, A, B) }]);
  assert.equal(A.knownOwner(home).owner, null);
  A.eyes = () => far;
  assert.equal(A.knownOwner(home).owner, null);
});

scenario('mes planètes sont toujours visibles', (film) => {
  const { players: [A, B] } = newGame(2);
  A.eyes = () => [];
  const mine = A.state.players[A.me].home;
  film.look(A, 'A sans aucun œil : il voit quand même sa planète', [{ show: 'à qui, pour A', at: mine, expected: 'A', got: who(A, mine, A, B) }]);
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
  film.look(A, 'A sauvegarde : le souvenir de la planète de B est dans la sauvegarde', [
    { show: 'souvenir', at: home, expected: 'B', got: A.intel[`${home.x},${home.y}`]?.pid === B.me ? 'B' : 'rien' },
    { show: 'souvenir sauvegardé', at: home, expected: 'B', got: saved.intel[`${home.x},${home.y}`]?.pid === B.me ? 'B' : 'rien' },
  ]);
  assert.equal(saved.intel[`${home.x},${home.y}`]?.pid, B.me);
});
