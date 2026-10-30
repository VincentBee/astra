// Alertes d'une planète : famine et panne d'énergie (pastille, toast, bandeau).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { game } from './harness.mjs';

const T0 = 10_000_000;
const { newPlanet, stateAt, planetAlerts, SPEED } = game;
const alerts = (p) => planetAlerts(p.race, stateAt(p, T0));

test('planète de départ : aucune alerte', () => {
  for (const race of ['human', 'machine', 'alien']) assert.deepEqual(alerts(newPlanet(race, T0)), [], race);
});

test('humains sans nourriture : famine', () => {
  const p = newPlanet('human', T0);
  p.stock = { ...p.stock, food: 0 };
  p.levels = { ...p.levels, farm: 0 };
  const a = alerts(p);
  assert.equal(a[0].res, 'food');
  assert.equal(a[0].kind, 'short');
});

test('aliens sans énergie : panne', () => {
  const p = newPlanet('alien', T0);
  p.stock = { ...p.stock, energy: 0 };
  p.levels = { ...p.levels, prism: 0 };
  assert.ok(alerts(p).some((x) => x.res === 'energy' && x.kind === 'short'));
});

test('machines : jamais d’alerte de nourriture', () => {
  const p = newPlanet('machine', T0);
  p.stock = { ...p.stock, food: 0, energy: 0 };
  p.levels = { ...p.levels, reactor: 0 };
  const a = alerts(p);
  assert.ok(a.every((x) => x.res !== 'food'));
  assert.ok(a.some((x) => x.res === 'energy' && x.kind === 'short'));
});

test('stock qui baisse : déficit, avec le temps avant d’être vide', () => {
  const p = newPlanet('human', T0);
  p.levels = { ...p.levels, farm: 0 };
  p.stock = { ...p.stock, food: 500 };
  const s = stateAt(p, T0);
  const a = planetAlerts('human', s).find((x) => x.res === 'food');
  assert.equal(a.kind, 'deficit');
  const expected = (500 / -s.prod.net.food) * 3_600_000 / SPEED;
  assert.ok(Math.abs(a.left - expected) < 1, `${a.left} ≈ ${expected}`);
});

test('les pénuries passent avant les déficits', () => {
  const p = newPlanet('alien', T0);
  p.levels = { ...p.levels, prism: 0, hive: 0 };
  p.stock = { ...p.stock, energy: 0, food: 500 };
  const a = alerts(p);
  assert.equal(a[0].kind, 'short');
});
