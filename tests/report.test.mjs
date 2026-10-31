// Rapport de combat détaillé (D-122) : le déroulé de `battle`, son explication
// (pourquoi on gagne ou on perd) et son voyage jusqu'au carnet du défenseur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { battle } from '../js/fleet.js';
import { explainBattle, sideTable, cleanReport } from '../js/report.js';
import { newGame } from './harness.mjs';

const P = (s) => s.state.players[s.me];

test('battle : le déroulé donne les forces au départ et chaque passe, cohérent avec les pertes', () => {
  const res = battle({ race: 'human', ships: { fighter: 10, cargo: 2 }, tech: {} }, { race: 'machine', ships: { fighter: 4 }, tech: {}, fort: { attack: 20, hull: 100 } });
  const r = res.report;
  assert.deepEqual(r.a.ships, { fighter: 10, cargo: 2 });
  assert.equal(r.a.fire, 120, '10 frégates × 12');
  assert.equal(r.a.hull, 10 * 30 + 2 * 20);
  assert.equal(r.d.fire, 4 * 9 + 20, 'drones et défense');
  assert.deepEqual(r.d.fort, { attack: 20, hull: 100 });
  assert.ok(r.rounds.length >= 1 && r.rounds.length <= 4);
  assert.equal(r.rounds[0].a, 120);
  // Les pertes passe par passe font les pertes du combat (hors défense, qui n'est pas un vaisseau).
  const sum = (key) => r.rounds.reduce((t, x) => t + Object.entries(x[key]).filter(([k]) => k !== 'fort').reduce((u, [, v]) => u + v, 0), 0);
  assert.equal(sum('aLost'), Object.values(res.attLost).reduce((a, b) => a + b, 0));
  assert.equal(sum('dLost'), Object.values(res.defLost).reduce((a, b) => a + b, 0));
  assert.ok(res.won);
  assert.equal(r.rounds.reduce((t, x) => t + (x.dLost.fort || 0), 0), 1, 'la défense est tombée');
});

test('explication : le vainqueur et le vaincu lisent chacun pourquoi, avec les chiffres', () => {
  const res = battle({ race: 'human', ships: { fighter: 3 }, tech: {} }, { race: 'human', ships: { heavy: 3 }, tech: {} });
  assert.equal(res.won, false);
  const a = explainBattle(res.report, 'a');
  const d = explainBattle(res.report, 'd');
  assert.equal(a.outcome, 'loss');
  assert.equal(d.outcome, 'win');
  assert.match(a.reasons[0], /Son feu \(120 par passe\) a abattu ta coque \(90\)/);
  assert.match(a.reasons.join(' '), /Rapport de forces \(feu × coque\) : 1 contre \d+(,\d)? pour l’adversaire\. Pour l’emporter, il t’aurait fallu environ/);
  assert.match(d.reasons[0], /^Ton feu \(120 par passe\)/);
  assert.equal(a.rounds.length, res.report.rounds.length);
  assert.match(a.rounds[0], /^Passe 1 : tu tires 36, l’adversaire 120 ; tu perds 3 × Frégate/);
  assert.match(d.rounds[0], /^Passe 1 : tu tires 120, l’adversaire 36 ; tu ne perds rien/);
});

test('explication : défense de planète, technologies, cargos sans armes, combat indécis', () => {
  const res = battle(
    { race: 'human', ships: { fighter: 2, cargo: 10 }, tech: { blindage: 2 } },
    { race: 'alien', ships: { heavy: 1 }, tech: {}, fort: { attack: 5, hull: 2000 } },
  );
  const a = explainBattle(res.report, 'a');
  assert.equal(a.outcome, 'draw');
  assert.match(a.reasons[0], /^Personne n’est abattu après les 4 passes du combat/);
  const all = a.reasons.join(' | ');
  assert.match(all, /Sa planète se défend : ses bâtiments comptent pour 5 d’attaque et 2\s000 de coque/u);
  assert.match(all, /Elle tient/);
  assert.match(all, /Technologies : ton attaque ×1 et ta coque ×1,/);
  assert.match(all, /Tes vaisseaux sans armes \(Cargo Hermès\) portaient \d+ % de ta coque/);
  const d = explainBattle(res.report, 'd');
  assert.match(d.reasons.join(' '), /Tes bâtiments défendent la planète/);
  const t = sideTable(res.report, 'd');
  assert.deepEqual(t.rows.map((r) => r.key), ['heavy', 'fort']);
  assert.equal(t.rows[0].name, 'Léviathan');
});

test('explication : vaisseaux sans armes, et victoire sans butin', () => {
  const res = battle({ race: 'human', ships: { cargo: 3 }, tech: {} }, { race: 'human', ships: { fighter: 5 }, tech: {} });
  assert.match(explainBattle(res.report, 'a').reasons[0], /Tes vaisseaux n’avaient aucune arme/);
  const win = battle({ race: 'human', ships: { heavy: 5 }, tech: {} }, { race: 'human', ships: { cargo: 1 }, tech: {} });
  const x = explainBattle(win.report, 'a', { noLoot: 'cooldown', cooldown: 48_000 });
  assert.match(x.reasons[0], /L’adversaire n’avait aucune arme/);
  assert.match(x.reasons.at(-1), /Pas de butin : tu as déjà pillé cette planète il y a moins de 48 s/);
});

test('cleanReport : un déroulé trafiqué est borné, un déroulé illisible écarté', () => {
  assert.equal(cleanReport(null), undefined);
  assert.equal(cleanReport({ a: {}, d: {} }), undefined);
  const r = cleanReport({
    a: { race: '__proto__', ships: { fighter: -3, heavy: 1e12, x: 4 }, bonus: { attack: 'x' }, fire: Infinity, hull: 10, hullLeft: -1 },
    d: { race: 'human', ships: { cargo: 2 }, fort: { attack: 1, hull: 2 } },
    rounds: [{ a: 1, d: 2, aLost: { heavy: 1 }, dLost: {} }, 1, 2, 3, 4, 5, 6],
  });
  assert.equal(r.a.race, null);
  assert.deepEqual(r.a.ships, { heavy: 1e7 });
  assert.deepEqual(r.a.bonus, { attack: 1, hull: 1 });
  assert.equal(r.a.fire, 0);
  assert.equal(r.a.hullLeft, 0);
  assert.ok(r.rounds.length <= 4);
  assert.doesNotThrow(() => explainBattle(r, 'a'));
  assert.doesNotThrow(() => sideTable(r, 'd'));
});

/** A (humain) en orbite sur la planète de B (machine, 4 drones, 4000 minéraux), qui attaque. */
function raid() {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  B.touch();
  sync(A, B);
  const ap = P(A).planet;
  ap.ships = { fighter: 20, cargo: 20 };
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  const id = A.takeOff('home', { fighter: 20, cargo: 20 }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  A.moveFleet(id, cell, 'attack');
  A.tick();
  return { A, B, clock, sync, id, cell };
}

test('carnet : l’attaquant et le défenseur ont le même déroulé, chacun de son côté', () => {
  const { A, B, sync } = raid();
  const a = A.journal.list.find((e) => e.kind === 'combat');
  assert.equal(a.side, 'a');
  assert.ok(a.rep?.rounds.length, 'le déroulé est dans le carnet de A');
  assert.ok(a.rep.d.fort?.hull > 0, 'avec la défense de la planète');
  assert.ok(P(A).effects.some((e) => e.rep), 'et dans le rapport envoyé à B');
  sync(B, A);
  B.tick();
  const b = B.journal.list.find((e) => e.kind === 'combat');
  assert.equal(b.side, 'd');
  assert.deepEqual(b.rep, a.rep, 'B lit le même déroulé');
  assert.equal(explainBattle(b.rep, 'd').outcome, 'loss');
  assert.equal(explainBattle(a.rep, 'a').outcome, 'win');
});

test('carnet : une seconde attaque trop tôt dit pourquoi elle ne rapporte rien', () => {
  const { A, clock, id, cell } = raid();
  clock.t += 1000;
  A.moveFleet(id, cell, 'attack');
  A.tick();
  const last = A.journal.list.filter((e) => e.kind === 'combat').at(-1);
  assert.equal(last.noLoot, 'cooldown');
  assert.match(explainBattle(last.rep, 'a', last).reasons.at(-1), /Pas de butin : tu as déjà pillé/);
});
