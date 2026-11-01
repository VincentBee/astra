// Alertes d'une planète : famine et panne d'énergie (pastille, toast, bandeau).
//
// En scénario (D-129) : chaque règle est vérifiée sur une planète neuve (`newPlanet`), puis la
// même situation est mise sur la planète mère du joueur A, qui la touche : l'image du rapport
// montre son vrai écran, avec la pastille, le bandeau de pénurie et la fiche de sa planète.
import assert from 'node:assert/strict';
import { game, newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const T0 = 10_000_000;
const { newPlanet, stateAt, planetAlerts, SPEED } = game;
const alerts = (p) => planetAlerts(p.race, stateAt(p, T0));
const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

/**
 * A, de race `race`, reçoit sur sa planète mère le stock et les niveaux de `p` (la planète
 * vérifiée) ; il touche sa planète : sa fiche s'ouvre, avec les alertes qu'en tire le jeu.
 */
function show(film, race, p, label) {
  const { players: [A] } = newGame(2, [race, 'human']);
  const pl = P(A).planet;
  Object.assign(pl, { stock: { ...pl.stock, ...p.stock }, levels: { ...pl.levels, ...p.levels } });
  A.touch();
  const home = { ...P(A).home };
  film.look(A, label, [{ sheet: home, button: true }]);
  // Ce que le jeu affiche (renderAlerts, js/app.js) : les mêmes alertes que la planète vérifiée.
  assert.deepEqual(planetAlerts(race, stateAt(pl, A.now())).map((x) => [x.res, x.kind]), planetAlerts(race, stateAt(p, T0)).map((x) => [x.res, x.kind]), 'le jeu de A montre les mêmes alertes');
}

scenario('planète de départ : aucune alerte', (film) => {
  for (const race of ['human', 'machine', 'alien']) assert.deepEqual(alerts(newPlanet(race, T0)), [], race);
  for (const race of ['human', 'machine', 'alien']) show(film, race, newPlanet(race, T0), `planète de départ (${race}) : tout va bien`);
});

scenario('humains sans nourriture : famine', (film) => {
  const p = newPlanet('human', T0);
  p.stock = { ...p.stock, food: 0 };
  p.levels = { ...p.levels, farm: 0 };
  const a = alerts(p);
  assert.equal(a[0].res, 'food');
  assert.equal(a[0].kind, 'short');
  show(film, 'human', p, 'humains sans nourriture ni ferme : famine');
});

scenario('aliens sans énergie : panne', (film) => {
  const p = newPlanet('alien', T0);
  p.stock = { ...p.stock, energy: 0 };
  p.levels = { ...p.levels, prism: 0 };
  assert.ok(alerts(p).some((x) => x.res === 'energy' && x.kind === 'short'));
  show(film, 'alien', p, 'aliens sans énergie ni prisme : panne');
});

scenario('machines : jamais d’alerte de nourriture', (film) => {
  const p = newPlanet('machine', T0);
  p.stock = { ...p.stock, food: 0, energy: 0 };
  p.levels = { ...p.levels, reactor: 0 };
  const a = alerts(p);
  assert.ok(a.every((x) => x.res !== 'food'));
  assert.ok(a.some((x) => x.res === 'energy' && x.kind === 'short'));
  show(film, 'machine', p, 'machines sans nourriture ni énergie : seulement la panne');
});

scenario('stock qui baisse : déficit, avec le temps avant d’être vide', (film) => {
  const p = newPlanet('human', T0);
  p.levels = { ...p.levels, farm: 0 };
  p.stock = { ...p.stock, food: 500 };
  const s = stateAt(p, T0);
  const a = planetAlerts('human', s).find((x) => x.res === 'food');
  assert.equal(a.kind, 'deficit');
  const expected = (500 / -s.prod.net.food) * 3_600_000 / SPEED;
  assert.ok(Math.abs(a.left - expected) < 1, `${a.left} ≈ ${expected}`);
  show(film, 'human', p, 'humains sans ferme, 500 de nourriture : elle baisse');
});

scenario('les pénuries passent avant les déficits', (film) => {
  const p = newPlanet('alien', T0);
  p.levels = { ...p.levels, prism: 0, hive: 0 };
  p.stock = { ...p.stock, energy: 0, food: 500 };
  const a = alerts(p);
  assert.equal(a[0].kind, 'short');
  show(film, 'alien', p, 'aliens : panne d’énergie, et nourriture en baisse');
});
