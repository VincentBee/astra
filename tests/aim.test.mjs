// Visée sur la carte (D-126) : aimant du doigt, départage des objets proches, place du menu.
//
// En scénario (D-129) : la visée est de la géométrie pure (js/aim.js), vérifiée par les assert
// sur des objets posés à la main. Chaque scénario met aussi la même situation dans une vraie
// partie (planète mère de A, flottes en orbite ou empilées, flotte ennemie) : l'image du rapport
// montre la carte du joueur telle qu'il la touche. Le premier scénario montre aussi le doigt (D-146) :
// son cercle, au zoom du test, vérifié par `film.look`. Ailleurs, le doigt, le zoom et le menu ne
// se voient pas : ils ne sont vérifiés que par les assert.
import assert from 'node:assert/strict';
import { reach, underFinger, contenders, readTap, menuPlace, FINGER, MIN_REACH } from '../js/aim.js';
import { newGame, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

const planet = (x, y, name = 'P') => ({ type: 'planet', w: { x, y, name }, x, y });
const mine = (id, x, y) => ({ type: 'mine', id, x, y });
const foe = (id, x, y) => ({ type: 'foe', id, x, y });

/**
 * Deux humains. `park(s, at)` : une flotte d'un chasseur de `s`, arrêtée en `at` (sur une
 * planète, la carte la dessine en orbite). `at(dx, dy)` : la case à dx, dy de la planète mère
 * de A, du côté où la carte a la place.
 */
function table() {
  const g = newGame(2, ['human', 'human']);
  const [A, B] = g.players;
  const home = { ...P(A).home };
  const sx = home.x < game.UNIVERSE.w / 2 ? 1 : -1;
  const sy = home.y < game.UNIVERSE.h / 2 ? 1 : -1;
  const park = (s, at) => {
    const pl = P(s).planet;
    pl.ships = { fighter: 1 };
    pl.stock = { ...pl.stock, energy: 5000 };
    const id = s.takeOff('home', { fighter: 1 }, {}, 0);
    Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel: 40 });
    s.touch();
    return id;
  };
  return { ...g, A, B, home, park, at: (dx, dy = 0) => ({ x: home.x + sx * dx, y: home.y + sy * dy }) };
}

scenario('D-126 : le doigt a une taille fixe à l’écran, jamais moins de MIN_REACH case', (film) => {
  assert.equal(reach(FINGER), 1); // case de 18 px (carte entière sur un téléphone) : une case autour du doigt
  assert.equal(reach(72), MIN_REACH); // zoom 4 : 0,6 case, pas 0,25
  // Aimant : un toucher à 0,8 case d'une planète la vise encore, à zoom 1.
  assert.equal(underFinger([planet(5, 5)], { x: 5.8, y: 5 }, 18).length, 1);
  assert.equal(underFinger([planet(5, 5)], { x: 6.2, y: 5 }, 18).length, 0);
  // La même chose dans la partie, doigt dessiné : à côté de la planète mère de A, du côté où la carte a la place.
  const { A, home, at } = table();
  const near = (d) => ({ x: at(d).x, y: home.y });
  film.look(A, 'carte entière (case de 18 px) : le doigt couvre 1 case ; A touche à 0,8 case de sa planète mère, elle est dessous, sa fiche s’ouvre', [
    { finger: { at: near(0.8), px: FINGER }, hits: home },
    { sheet: home, button: true },
  ]);
  film.look(A, 'carte entière : A touche à 1,2 case, sa planète est hors du doigt, rien ne s’ouvre', [{ finger: { at: near(1.2), px: FINGER }, hits: null }]);
  film.look(A, 'zoom 4 (case de 72 px) : 18 px ne couvriraient que 0,25 case, le doigt en garde 0,6 ; A touche à 0,5 case, sa planète est encore dessous', [
    { finger: { at: near(0.5), px: 72, zoom: 4 }, hits: home },
    { sheet: home, button: true },
  ]);
});

scenario('D-126 : flotte en orbite et planète sous le doigt, carte entière → on demande (menu)', (film) => {
  // Orbite à 0,36 case du centre : 6,5 px à 18 px la case, trop près pour deviner.
  const items = [planet(5, 5), mine('a', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 18);
  assert.equal(t.kind, 'many');
  assert.equal(t.list.length, 2);
  const { A, home, park } = table();
  const id = park(A, home);
  film.look(A, 'la flotte de A en orbite de sa planète mère : à zoom 1, les deux sous le doigt (menu)', [{ fleet: [A, id], visible: true }]);
});

scenario('D-126 : même endroit, carte zoomée → la planète touchée en plein gagne', (film) => {
  const items = [planet(5, 5), mine('a', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 72);
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
  const { A, home, park } = table();
  const id = park(A, home);
  film.look(A, 'zoomé, A touche sa planète en plein : sa fiche s’ouvre', [{ fleet: [A, id], visible: true }, { sheet: home, button: true }]);
});

scenario('D-126 : flottes adverses ignorées sans flotte sélectionnée, visées avec', (film) => {
  const items = [foe('z', 8, 8)];
  assert.equal(readTap(items, { x: 8, y: 8 }, 18).kind, 'empty');
  const t = readTap(items, { x: 8, y: 8 }, 18, 'a');
  assert.equal(t.kind, 'one');
  assert.equal(t.it.id, 'z');
  const { A, B, sync, park, at } = table();
  const z = park(B, at(2));
  sync(A, B);
  film.look(A, 'une flotte de B près de la planète de A : sans flotte sélectionnée, la toucher ne fait rien', [{ fleet: [B, z], visible: true }]);
  const a = park(A, at(1));
  film.look(A, 'A a une flotte à lui : sélectionnée, elle peut viser celle de B', [{ fleet: [A, a], visible: true }, { fleet: [B, z], visible: true }]);
});

scenario('D-126 : la flotte sélectionnée seule sous le doigt (la relâcher) ; au milieu d’autres, on vise les autres', (film) => {
  const alone = readTap([mine('a', 3, 3)], { x: 3, y: 3 }, 18, 'a');
  assert.equal(alone.kind, 'one');
  assert.equal(alone.it.id, 'a');
  // En orbite de sa cible : toucher la planète vise la planète, pas la flotte.
  const t = readTap([planet(5, 5), mine('a', 5.25, 4.75)], { x: 5.1, y: 4.9 }, 18, 'a');
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
  const { A, home, park, at } = table();
  const a = park(A, at(3, 3));
  film.look(A, 'la flotte de A seule dans le vide : la toucher la relâche', [{ fleet: [A, a], visible: true }]);
  A.myFleet(a).from = { ...home };
  A.myFleet(a).to = { ...home };
  A.touch();
  film.look(A, 'la même flotte en orbite de la planète mère : toucher vise la planète', [{ fleet: [A, a], visible: true }, { sheet: home, button: true }]);
});

scenario('D-126 : flotte lâchée après l’avoir traînée → mes flottes ne sont pas des cibles', (film) => {
  const items = [planet(5, 5), mine('b', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 18, 'a', true);
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
  assert.equal(readTap([mine('b', 9, 9)], { x: 9, y: 9 }, 18, 'a', true).kind, 'empty');
  const { A, home, park, at } = table();
  const a = park(A, at(3));
  const b = park(A, home);
  film.look(A, 'A traîne une flotte et la lâche sur sa planète, où une autre est en orbite : la planète est visée', [{ fleet: [A, a], visible: true }, { fleet: [A, b], visible: true }, { sheet: home, button: true }]);
});

scenario('D-126 : deux flottes empilées → menu des deux, plus de tours de manège', (film) => {
  const t = readTap([mine('a', 2.25, 1.75), mine('b', 2.1, 2.3)], { x: 2.2, y: 2 }, 18);
  assert.equal(t.kind, 'many');
  assert.deepEqual(t.list.map((it) => it.id).sort(), ['a', 'b']);
  // Nettement plus près de l'une (écart ≥ GAP pixels) : elle est choisie tout de suite.
  const near = readTap([mine('a', 2, 2), mine('b', 3, 2)], { x: 2.05, y: 2 }, 18);
  assert.equal(near.kind, 'one');
  assert.equal(near.it.id, 'a');
  assert.ok(contenders(underFinger([mine('a', 2, 2), mine('b', 3, 2)], { x: 2.05, y: 2 }, 18), 18).length === 1);
  const { A, park, at } = table();
  const a = park(A, at(3, 2));
  const b = park(A, at(3, 2));
  film.look(A, 'deux flottes de A sur la même case : les toucher ouvre le menu des deux', [{ fleet: [A, a], visible: true }, { fleet: [A, b], visible: true }]);
  const c = park(A, at(4, 2));
  film.look(A, 'une flotte une case plus loin : nettement plus près de l’une, elle est choisie tout de suite', [{ fleet: [A, c], visible: true }]);
});

scenario('D-126 : le menu reste dans la carte, à droite du doigt s’il y a la place, sinon à gauche', (film) => {
  assert.deepEqual(menuPlace(50, 100, 120, 80, 360, 360), { x: 66, y: 60 });
  const right = menuPlace(330, 100, 120, 80, 360, 360);
  assert.equal(right.x, 330 - 120 - 16);
  const corner = menuPlace(355, 355, 120, 80, 360, 360);
  assert.ok(corner.x >= 8 && corner.x + 120 <= 352);
  assert.ok(corner.y >= 8 && corner.y + 80 <= 352);
  // Deux flottes empilées dans le coin de la carte : c'est là que le menu doit rentrer à gauche.
  const { A, park } = table();
  const corner2 = { x: game.UNIVERSE.w - 1, y: game.UNIVERSE.h - 1 };
  const a = park(A, corner2);
  const b = park(A, corner2);
  film.look(A, 'deux flottes de A dans le coin de la carte : le menu s’ouvrirait à gauche, dans la carte', [{ fleet: [A, a], visible: true }, { fleet: [A, b], visible: true }]);
});
