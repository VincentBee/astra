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
  // Chaque seconde, comme dans le jeu : les deux téléphones passent, A reçoit la fiche de B.
  const second = () => {
    B.tick();
    sync(A, B);
    A.tick();
  };
  sync(A, B);
  film.look(A, 'au départ, dans la portée de A', [{ fleet: [B, id], visible: true }]);

  assert.equal(B.moveFleet(id, outside), true, 'départ accepté');
  sync(A, B);
  film.roll(A, clock, theirs().arrive, 'aller', second);
  film.look(A, 'arrivée hors de la portée de A', [{ fleet: [B, id], visible: false }]);

  assert.equal(B.moveFleet(id, inside), true, 'retour accepté');
  sync(A, B);
  film.roll(A, clock, theirs().arrive, 'retour', second);
  film.look(A, 'revenue dans la portée de A', [{ fleet: [B, id], visible: true }]);
});

// Brouillard dans le menu d'ordres (D-124, D-190, issue #35) : flotte choisie, toucher une
// planète des autres hors de ma portée ne donne ni son propriétaire, ni sa défense.

/** A a une flotte `ships` chez lui ; `cell` est la planète mère de B ; `view(eyes)` règle la vue de A. */
function target(ships) {
  const g = duel();
  const [A, B] = g.players;
  const id = park(A, ships, { ...P(A).home }, 100_000);
  const cell = { ...P(B).home };
  const view = (eyes) => (A.eyes = () => eyes);
  return { ...g, A, B, id, cell, view, near: [{ x: cell.x, y: cell.y, r: 1 }] };
}
const kinds = (orders) => orders.map((o) => o.kind).join(', ');
const labels = (orders) => orders.map((o) => o.label).join(' | ');

scenario('flotte armée, planète de B jamais vue et hors de portée : le menu la croit libre', (film) => {
  const { A, B, id, cell, view } = target({ fighter: 3 });
  view([]);
  const orders = A.ordersAt(id, cell);
  film.look(A, 'A touche la planète de B, qu’il n’a jamais vue', [
    { show: 'ordres', at: cell, expected: 'move', got: kinds(orders) },
    { show: 'nom de B dans le menu', at: cell, expected: false, got: labels(orders).includes(B.name) },
    { show: '« défense » dans le menu', at: cell, expected: false, got: /défense/.test(labels(orders)) },
  ]);
  assert.equal(kinds(orders), 'move');
  assert.doesNotMatch(labels(orders), new RegExp(`${B.name}|défense|victoire|bataille`));
});

scenario('colonisateur, planète de B jamais vue : « Coloniser », pas « Attaquer »', (film) => {
  const { A, B, id, cell, view } = target({ colony: 1 });
  view([]);
  const orders = A.ordersAt(id, cell);
  film.look(A, 'A vise la planète de B avec son colonisateur', [
    { show: 'ordres', at: cell, expected: 'colonize, move', got: kinds(orders) },
  ]);
  assert.equal(kinds(orders), 'colonize, move');
  assert.doesNotMatch(labels(orders), new RegExp(`${B.name}|défense`));
  // L'ordre part : le refus « pas libre » dirait ce que A ne voit pas. L'arrivée tranchera.
  assert.equal(A.moveFleet(id, cell, 'colonize'), true, 'colonisation acceptée vers une planète qui paraît libre');
});

scenario('à portée : vrai propriétaire et défense ; hors de portée ensuite : le propriétaire retenu, sans sa défense', (film) => {
  const { A, B, id, cell, view, near } = target({ fighter: 3 });
  view(near);
  const seen = A.ordersAt(id, cell);
  const attack = seen.find((o) => o.kind === 'attack');
  film.look(A, 'A voit la planète de B', [
    { show: 'ordres', at: cell, expected: 'attack, conquer, move', got: kinds(seen) },
    { show: 'défense montrée', at: cell, expected: true, got: /défense ⚔ \d+ ◇ \d+ \+ 0 vaisseau posé/.test(attack.label) },
  ]);
  assert.equal(kinds(seen), 'attack, conquer, move');
  assert.match(attack.label, new RegExp(`\\(${B.name}\\) · défense ⚔ \\d+ ◇ \\d+ \\+ 0 vaisseau posé · victoire`));
  assert.ok(attack.odds, 'une estimation à portée');

  view([]);
  const memo = A.ordersAt(id, cell);
  const blind = memo.find((o) => o.kind === 'attack');
  film.look(A, 'A ne la voit plus : il se souvient de B, pas de sa défense', [
    { show: 'ordres', at: cell, expected: 'attack, conquer, move', got: kinds(memo) },
    { show: 'B nommé', at: cell, expected: true, got: blind.label.includes(`(${B.name})`) },
    { show: 'défense montrée', at: cell, expected: false, got: /⚔|◇|vaisseau|victoire|bataille/.test(labels(memo)) },
  ]);
  assert.equal(kinds(memo), 'attack, conquer, move');
  assert.match(blind.label, new RegExp(`^Attaquer .+ \\(${B.name}\\) · hors de portée : défense inconnue$`));
  assert.doesNotMatch(labels(memo), /⚔|◇|vaisseau|victoire|bataille/);
  assert.equal(blind.odds, undefined, 'pas d’estimation hors de portée');
  assert.equal(A.moveFleet(id, cell, 'conquer'), true, 'l’ordre part vers la planète retenue');
});

scenario('ordre « Conquérir » vers une planète retenue, quittée hors de ma vue : il part, sans cible', (film) => {
  const { A, B, id, cell, view, near } = target({ fighter: 3 });
  view(near);
  A.ordersAt(id, cell); // A la voit : il retient B
  view([]);
  A.state.players[B.me].home = { x: -99, y: -99 }; // B la quitte, A ne le voit pas
  const orders = A.ordersAt(id, cell);
  film.look(A, 'A croit la planète encore à B', [{ show: 'ordres', at: cell, expected: 'attack, conquer, move', got: kinds(orders) }]);
  // Le refus « Aucune planète adverse ici » dirait à A qu'elle est libre : l'ordre part.
  assert.equal(A.moveFleet(id, cell, 'conquer'), true);
  assert.deepEqual(A.myFleet(id).order, { kind: 'conquer', pid: null, key: null });
  view(near);
  assert.equal(A.moveFleet(id, cell, 'conquer'), false, 'à portée, A voit qu’elle est libre : refusé');
});
