// Champ de vision des flottes (règles §8.6, D-030, D-128) : une flotte ennemie
// n'est visible que dans ma portée de détection, autour de mes planètes et de
// mes flottes ; les miennes le sont toujours. La carte ne dessine que les
// flottes pour lesquelles `sees` dit oui (`fleetSpots`, js/app.js) : ces tests
// vérifient la règle, pas le dessin du canvas.
//
// Écrits en scénarios (D-129) : l'intitulé dit ce qui est attendu ; en cas d'échec, le rapport
// tests/reports/vision.test.html montre la carte vue par A, image par image.
import assert from 'node:assert/strict';
import { newGame, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { sightRange } = await import('../js/tech.js');
const scenario = scenarios(import.meta.url);

const P = (s) => s.state.players[s.me];
const PLANET = sightRange('human', {}, 'planet');
const FLEET = sightRange('human', {}, 'fleet');

/** Une flotte de `s`, arrêtée en `at`. */
function park(s, ships, at, fuel = 40) {
  const pl = P(s).planet;
  pl.ships = { ...ships };
  pl.stock = { ...pl.stock, energy: 5000 };
  const id = s.takeOff('home', ships, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel });
  s.touch();
  return id;
}

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

scenario('flotte ennemie au bord de la portée de ma planète : visible', (film) => {
  const { players: [A, B], sync, at } = duel();
  const id = park(B, { cargo: 1 }, at(PLANET));
  sync(A, B);
  film.look(A, `flotte de B à ${PLANET} cases`, [{ fleet: [B, id], visible: true }]);
});

scenario('flotte ennemie une case trop loin de ma planète : cachée', (film) => {
  const { players: [A, B], sync, at } = duel();
  const id = park(B, { cargo: 1 }, at(PLANET + 1));
  sync(A, B);
  film.look(A, `flotte de B à ${PLANET + 1} cases`, [{ fleet: [B, id], visible: false }]);
  assert.ok(A.state.players[B.me].fleets.some((f) => f.id === id), 'la flotte cachée est dans la copie de A');
});

scenario('flotte ennemie en diagonale : la distance se mesure à vol d’oiseau', (film) => {
  const { players: [A, B], sync, at } = duel();
  const id = park(B, { cargo: 1 }, at(PLANET, PLANET));
  sync(A, B);
  film.look(A, 'flotte de B en diagonale', [{ fleet: [B, id], visible: false }]);
});

scenario('flottes ennemies près de ma flotte : vues dans sa portée, cachées au-delà', (film) => {
  const { players: [A, B], sync, at } = duel();
  const far = 8; // à 8 cases de la planète mère de A : hors de sa portée, même un peu à côté
  park(A, { fighter: 1 }, at(far));
  const near = park(B, { cargo: 1 }, at(far, FLEET));
  const out = park(B, { cargo: 1 }, at(far, FLEET + 1));
  sync(A, B);
  film.look(A, 'deux flottes de B autour de la flotte de A', [
    { fleet: [B, near], visible: true },
    { fleet: [B, out], visible: false },
  ]);
});

scenario('mes flottes sont toujours visibles, même loin de tout', (film) => {
  const { players: [A], at } = duel();
  const id = park(A, { fighter: 1 }, at(8, 8));
  film.look(A, 'A sans aucun œil', [{ fleet: [A, id], visible: true }], { eyes: [] });
});

scenario('flotte ennemie en route : cachée en sortant de ma portée, visible en revenant', (film) => {
  const { players: [A, B], sync, clock, at } = duel();
  const inside = at(PLANET - 1);
  const outside = at(PLANET + 3);
  const id = park(B, { cargo: 1 }, inside);
  const theirs = () => A.state.players[B.me].fleets.find((f) => f.id === id);
  sync(A, B);
  film.look(A, 'au départ, dans la portée de A', [{ fleet: [B, id], visible: true }]);

  assert.equal(B.moveFleet(id, outside), true, 'départ accepté');
  sync(A, B);
  const { depart, arrive } = theirs();
  clock.t = (depart + arrive) / 2;
  film.look(A, 'en route vers l’extérieur');
  clock.t = arrive;
  film.look(A, 'arrivée hors de la portée de A', [{ fleet: [B, id], visible: false }]);

  assert.equal(B.moveFleet(id, inside), true, 'retour accepté');
  sync(A, B);
  clock.t = (theirs().depart + theirs().arrive) / 2;
  film.look(A, 'sur le chemin du retour');
  clock.t = theirs().arrive;
  film.look(A, 'revenue dans la portée de A', [{ fleet: [B, id], visible: true }]);
});
