// « Retour » pendant une partie en cours (D-417) : js/back.js dit quoi faire du retour.
// Le parcours dans un vrai navigateur (historique, fenêtre, « Quitter ») : tests/back-browser.mjs.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playing, backAction } from '../js/back.js';

const enCours = { status: 'playing', startedAt: 1000, over: null, gameShown: true, sheetOpen: false };

test('partie en cours : on demande avant de quitter', () => {
  assert.equal(playing(enCours), true);
  assert.equal(backAction(enCours), 'ask');
});

test('une fenêtre ouverte : on la ferme et on reste', () => {
  assert.equal(backAction({ ...enCours, sheetOpen: true }), 'close');
});

test('lobby (pas encore partie) : pas d’alerte', () => {
  assert.equal(backAction({ ...enCours, startedAt: null }), 'pass');
  assert.equal(backAction({ ...enCours, startedAt: undefined, sheetOpen: true }), 'pass');
});

test('partie finie : pas d’alerte', () => {
  assert.equal(backAction({ ...enCours, over: { at: 2000, winner: 'a' } }), 'pass');
});

test('autre écran ou partie pas jouée : pas d’alerte', () => {
  assert.equal(backAction({ ...enCours, gameShown: false }), 'pass');
  assert.equal(backAction({ ...enCours, status: 'waiting' }), 'pass');
});
