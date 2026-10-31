// Visée sur la carte (D-126) : aimant du doigt, départage des objets proches, place du menu.
import test from 'node:test';
import assert from 'node:assert/strict';
import { reach, underFinger, contenders, readTap, menuPlace, FINGER, MIN_REACH } from '../js/aim.js';

const planet = (x, y, name = 'P') => ({ type: 'planet', w: { x, y, name }, x, y });
const mine = (id, x, y) => ({ type: 'mine', id, x, y });
const foe = (id, x, y) => ({ type: 'foe', id, x, y });

test('D-126 : le doigt a une taille fixe à l’écran, jamais moins de MIN_REACH case', () => {
  assert.equal(reach(FINGER), 1); // case de 18 px (carte entière sur un téléphone) : une case autour du doigt
  assert.equal(reach(72), MIN_REACH); // zoom 4 : 0,6 case, pas 0,25
  // Aimant : un toucher à 0,8 case d'une planète la vise encore, à zoom 1.
  assert.equal(underFinger([planet(5, 5)], { x: 5.8, y: 5 }, 18).length, 1);
  assert.equal(underFinger([planet(5, 5)], { x: 6.2, y: 5 }, 18).length, 0);
});

test('D-126 : flotte en orbite et planète sous le doigt, carte entière → on demande (menu)', () => {
  // Orbite à 0,36 case du centre : 6,5 px à 18 px la case, trop près pour deviner.
  const items = [planet(5, 5), mine('a', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 18);
  assert.equal(t.kind, 'many');
  assert.equal(t.list.length, 2);
});

test('D-126 : même endroit, carte zoomée → la planète touchée en plein gagne', () => {
  const items = [planet(5, 5), mine('a', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 72);
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
});

test('D-126 : flottes adverses ignorées sans flotte sélectionnée, visées avec', () => {
  const items = [foe('z', 8, 8)];
  assert.equal(readTap(items, { x: 8, y: 8 }, 18).kind, 'empty');
  const t = readTap(items, { x: 8, y: 8 }, 18, 'a');
  assert.equal(t.kind, 'one');
  assert.equal(t.it.id, 'z');
});

test('D-126 : la flotte sélectionnée seule sous le doigt (la relâcher) ; au milieu d’autres, on vise les autres', () => {
  const alone = readTap([mine('a', 3, 3)], { x: 3, y: 3 }, 18, 'a');
  assert.equal(alone.kind, 'one');
  assert.equal(alone.it.id, 'a');
  // En orbite de sa cible : toucher la planète vise la planète, pas la flotte.
  const t = readTap([planet(5, 5), mine('a', 5.25, 4.75)], { x: 5.1, y: 4.9 }, 18, 'a');
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
});

test('D-126 : flotte lâchée après l’avoir traînée → mes flottes ne sont pas des cibles', () => {
  const items = [planet(5, 5), mine('b', 5.25, 4.75)];
  const t = readTap(items, { x: 5, y: 5 }, 18, 'a', true);
  assert.equal(t.kind, 'one');
  assert.equal(t.it.type, 'planet');
  assert.equal(readTap([mine('b', 9, 9)], { x: 9, y: 9 }, 18, 'a', true).kind, 'empty');
});

test('D-126 : deux flottes empilées → menu des deux, plus de tours de manège', () => {
  const t = readTap([mine('a', 2.25, 1.75), mine('b', 2.1, 2.3)], { x: 2.2, y: 2 }, 18);
  assert.equal(t.kind, 'many');
  assert.deepEqual(t.list.map((it) => it.id).sort(), ['a', 'b']);
  // Nettement plus près de l'une (écart ≥ GAP pixels) : elle est choisie tout de suite.
  const near = readTap([mine('a', 2, 2), mine('b', 3, 2)], { x: 2.05, y: 2 }, 18);
  assert.equal(near.kind, 'one');
  assert.equal(near.it.id, 'a');
  assert.ok(contenders(underFinger([mine('a', 2, 2), mine('b', 3, 2)], { x: 2.05, y: 2 }, 18), 18).length === 1);
});

test('D-126 : le menu reste dans la carte, à droite du doigt s’il y a la place, sinon à gauche', () => {
  assert.deepEqual(menuPlace(50, 100, 120, 80, 360, 360), { x: 66, y: 60 });
  const right = menuPlace(330, 100, 120, 80, 360, 360);
  assert.equal(right.x, 330 - 120 - 16);
  const corner = menuPlace(355, 355, 120, 80, 360, 360);
  assert.ok(corner.x >= 8 && corner.x + 120 <= 352);
  assert.ok(corner.y >= 8 && corner.y + 80 <= 352);
});
