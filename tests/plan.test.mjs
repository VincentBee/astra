// Fil de construction d'une planète (D-105) : chantier libre, le bâtiment
// suivant se lance tout seul dès que le stock couvre son prix, même pendant
// une absence ; les estimations disent quand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';

const { replay, comparable } = await import('../js/replay.js');

const T0 = 10_000_000;
const SEC = 1000;
const MIN = 60_000;

/** Une planète humaine sans stock : rien n'est payable tout de suite. */
function poor() {
  const p = game.newPlanet('human', T0, game.planetsFor('gtest')[0]);
  p.levels = { ...p.levels, mine: 4, solar: 2 };
  p.stock = { minerals: 0, food: 200, energy: 200 };
  return p;
}

test('le premier du fil se lance quand le stock suffit, pas avant', () => {
  const p = poor();
  p.plan = ['mine'];
  const cost = game.upgradeCost('human', 'mine', 4);
  const early = game.stateAt(p, T0 + SEC);
  assert.equal(early.queue, null);
  assert.deepEqual(early.plan, ['mine']);
  // Assez tard pour que les minéraux arrivent : le chantier est lancé, au moment où le stock suffisait.
  const later = game.stateAt(p, T0 + 30 * MIN);
  const start = later.done.find((d) => d.kind === 'start');
  assert.ok(start, 'lancé tout seul');
  assert.equal(start.key, 'mine');
  assert.equal(start.level, 5);
  assert.ok(start.start > T0 + SEC);
  // Juste avant ce moment-là, le stock ne couvrait pas encore le prix.
  const before = game.stateAt(p, start.start - 2 * SEC);
  assert.ok(!game.covers(before.stock, cost));
  assert.equal(later.plan.length, 0);
});

test('le fil garde son ordre et enchaîne sans attendre un passage du joueur', () => {
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.plan = ['solar', 'mine', 'solar'];
  const s = game.stateAt(p, T0 + 60 * MIN);
  const starts = s.done.filter((d) => d.kind === 'start');
  assert.deepEqual(starts.map((d) => d.key), ['solar', 'mine', 'solar']);
  assert.deepEqual(starts.map((d) => d.level), [3, 5, 4]);
  // Chaque chantier commence à la fin du précédent (le stock suffit déjà).
  const ends = s.done.filter((d) => d.kind === 'queue');
  assert.equal(starts[1].start, ends[0].end);
  assert.equal(starts[2].start, ends[1].end);
  assert.equal(s.levels.solar, 4);
});

test('settle écrit le fil restant, et ne recompte rien en heure qui recule', () => {
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.plan = ['solar', 'mine'];
  const done = game.settle(p, T0 + SEC);
  assert.equal(done.filter((d) => d.kind === 'start').length, 1);
  assert.deepEqual(p.plan, ['mine']);
  assert.equal(p.queue.key, 'solar');
  const copy = clone(p);
  game.settle(p, T0); // l'horloge recule : rien ne change
  assert.deepEqual(p, copy);
});

test('plus de place : le fil attend, et l’estimation dit pourquoi', () => {
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.places = game.usedPlaces(p.levels);
  p.plan = ['mine'];
  const s = game.stateAt(p, T0 + 10 * MIN);
  assert.equal(s.queue, null);
  assert.deepEqual(s.plan, ['mine']);
  const [f] = game.planForecast(p, T0);
  assert.equal(f.start, null);
  assert.equal(f.why, 'Plus de place');
});

test('estimation : dans l’ordre, après le chantier en cours, et identique au vrai calcul', () => {
  const p = poor();
  p.plan = ['mine', 'solar'];
  const f = game.planForecast(p, T0);
  assert.equal(f.length, 2);
  assert.ok(f[0].start > T0);
  assert.ok(f[1].start >= f[0].end);
  assert.equal(f[0].level, 5);
  // Ce qui est annoncé à 10 min près est ce qui arrive vraiment.
  const real = game.stateAt(p, f[0].start + 1).done.find((d) => d.kind === 'start');
  assert.ok(Math.abs(real.start - f[0].start) <= 2 * SEC);
});

test('le joueur : fil par ordre, lancement au passage, retrait, et la partie se rejoue à l’identique', () => {
  const { players, clock, sync } = newGame(2);
  const [a, b] = players;
  const pa = () => a.state.players[a.me].planet;
  // Le stock de départ paie la première mine (lancée tout de suite) ; les suivantes attendent.
  for (let i = 0; i < 4; i++) a.planBuild('mine');
  assert.equal(pa().queue.key, 'mine');
  assert.deepEqual(pa().plan, ['mine', 'mine', 'mine']);
  a.unplan('farm', 2); // ce n'est pas ce qui est à cette place : refusé
  assert.equal(pa().plan.length, 3);
  a.unplan('mine', 2);
  assert.deepEqual(pa().plan, ['mine', 'mine']);
  a.unplan('mine', 5); // refusé, sans dégâts
  assert.equal(pa().plan.length, 2);
  for (let i = 0; i < 40; i++) {
    clock.t += 30 * SEC;
    a.tick();
    b.tick();
    sync(b, a);
    sync(a, b);
  }
  const log = a.state.log.map((l) => l.text);
  assert.ok(log.some((t) => t.includes('(fil)')), 'lancement automatique noté au journal');
  assert.equal(pa().plan.length, 0, 'tout le fil est lancé');
  assert.equal(pa().levels.mine, 4);
  const r = replay(clone(a.snapshot()));
  for (const p of Object.values(a.state.players)) assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
});

test('un fil abîmé reçu d’un autre est nettoyé', async () => {
  const { normalize } = await import('../js/session.js');
  const { players } = newGame(1);
  const p = clone(players[0].state.players[players[0].me]);
  p.planet.plan = ['mine', '__proto__', 42, 'nope', ...Array(20).fill('mine')];
  const n = normalize(p);
  assert.ok(n.planet.plan.every((k) => k === 'mine'));
  assert.equal(n.planet.plan.length, game.PLAN_MAX);
  p.planet.plan = 'mine';
  assert.deepEqual(normalize(p).planet.plan, []);
});
