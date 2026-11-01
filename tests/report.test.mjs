// Rapport de combat détaillé (D-122) : le déroulé de `battle`, son explication
// (pourquoi on gagne ou on perd) et son voyage jusqu'au carnet du défenseur.
import { scenarios } from './scenario.mjs';
import assert from 'node:assert/strict';
import { battle } from '../js/fleet.js';
import { explainBattle, sideTable, cleanReport } from '../js/report.js';
import { newGame } from './harness.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

/**
 * Le combat d'un test joué dans une vraie partie : A (race et vaisseaux de l'attaquant) en orbite
 * sur la planète mère de B (race et vaisseaux du défenseur) attaque ; B revient et lit le rapport.
 * Les images montrent l'écran de chacun avant et après. La défense de la planète vient ici de ses
 * bâtiments, pas du `fort` posé à la main : les chiffres exacts du déroulé ne sont vérifiés que par
 * les assert, sur `battle`.
 */
function stage(film, att, def) {
  const { players: [A, B], clock, sync } = newGame(2, [att.race, def.race]);
  P(B).planet.ships = { ...def.ships };
  B.touch();
  sync(A, B);
  const ap = P(A).planet;
  Object.assign(ap, { tech: { ...att.tech }, ships: { ...att.ships }, stock: { ...ap.stock, energy: 5000 } });
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  const id = A.takeOff('home', { ...att.ships }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  film.look(A, 'la flotte de A en orbite de la planète de B, avant l’attaque', [{ fleet: [A, id], visible: true }]);
  A.moveFleet(id, cell, 'attack');
  A.tick();
  assert.ok(A.journal.list.some((e) => e.kind === 'combat' && e.rep), 'le combat a eu lieu dans la partie');
  film.look(A, 'après le combat, vu par A (rapport dans son carnet)', [{ sheet: cell, button: false }]);
  sync(B, A);
  B.tick();
  film.look(B, 'B revient et lit le rapport', [{ sheet: cell, button: true }]);
  return { A, B, clock, sync, id, cell };
}

scenario('battle : le déroulé donne les forces au départ et chaque passe, cohérent avec les pertes', (film) => {
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
  stage(film, { race: 'human', ships: { fighter: 10, cargo: 2 }, tech: {} }, { race: 'machine', ships: { fighter: 4 } });
});

scenario('explication : le vainqueur et le vaincu lisent chacun pourquoi, avec les chiffres', (film) => {
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
  stage(film, { race: 'human', ships: { fighter: 3 }, tech: {} }, { race: 'human', ships: { heavy: 3 } });
});

scenario('explication : défense de planète, technologies, cargos sans armes, combat indécis', (film) => {
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
  stage(film, { race: 'human', ships: { fighter: 2, cargo: 10 }, tech: { blindage: 2 } }, { race: 'alien', ships: { heavy: 1 } });
});

scenario('explication : vaisseaux sans armes, et victoire sans butin', (film) => {
  const res = battle({ race: 'human', ships: { cargo: 3 }, tech: {} }, { race: 'human', ships: { fighter: 5 }, tech: {} });
  assert.match(explainBattle(res.report, 'a').reasons[0], /Tes vaisseaux n’avaient aucune arme/);
  const win = battle({ race: 'human', ships: { heavy: 5 }, tech: {} }, { race: 'human', ships: { cargo: 1 }, tech: {} });
  const x = explainBattle(win.report, 'a', { noLoot: 'cooldown', cooldown: 48_000 });
  assert.match(x.reasons[0], /L’adversaire n’avait aucune arme/);
  assert.match(x.reasons.at(-1), /Pas de butin : tu as déjà pillé cette planète il y a moins de 48 s/);
  // Le jeu refuse qu'une flotte sans armes attaque : un joueur ne rencontre « aucune arme » qu'en
  // défenseur. Ici, les mêmes 3 cargos défendent la planète de B contre les 5 frégates de A.
  stage(film, { race: 'human', ships: { fighter: 5 }, tech: {} }, { race: 'human', ships: { cargo: 3 } });
  // La victoire sans butin : le pillage trop tôt est joué en vrai dans « une seconde attaque trop tôt » ; ici, le même combat.
  stage(film, { race: 'human', ships: { heavy: 5 }, tech: {} }, { race: 'human', ships: { cargo: 1 } });
});

scenario('cleanReport : un déroulé trafiqué est borné, un déroulé illisible écarté', (film) => {
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
  // Où le joueur rencontre `cleanReport` : B lit le rapport d'un combat publié dans la fiche de A.
  // Ici, A a trafiqué ce rapport avant que B ne le lise ; l'image montre l'écran de B après lecture,
  // le bornage lui-même n'est vérifié que par les assert.
  const { A, B, sync } = raid(film);
  film.look(A, 'combat : A gagne, puis trafique le rapport qu’il publie');
  const e = P(A).effects.find((x) => x.rep);
  e.rep = { ...e.rep, a: { ...e.rep.a, ships: { fighter: -3, heavy: 1e12 } }, rounds: [...e.rep.rounds, 1, 2, 3, 4, 5, 6] };
  A.touch();
  sync(B, A);
  B.tick();
  film.look(B, 'B lit le rapport trafiqué : borné', [{ sheet: P(B).home, button: true }]);
  const b = B.journal.list.find((x) => x.kind === 'combat');
  assert.ok(b.rep.rounds.length <= 4, 'B ne lit que 4 passes au plus');
  assert.equal(b.rep.a.ships.heavy, 1e7, 'un effectif énorme est borné chez B');
});

/** A (humain) en orbite sur la planète de B (machine, 4 drones, 4000 minéraux), qui attaque. */
function raid(film) {
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
  film?.look(A, 'la flotte de A en orbite de la planète de B, qui attaque');
  A.moveFleet(id, cell, 'attack');
  A.tick();
  return { A, B, clock, sync, id, cell };
}

scenario('carnet : l’attaquant et le défenseur ont le même déroulé, chacun de son côté', (film) => {
  const { A, B, sync } = raid(film);
  film.look(A, 'combat : A gagne');
  const a = A.journal.list.find((e) => e.kind === 'combat');
  assert.equal(a.side, 'a');
  assert.ok(a.rep?.rounds.length, 'le déroulé est dans le carnet de A');
  assert.ok(a.rep.d.fort?.hull > 0, 'avec la défense de la planète');
  assert.ok(P(A).effects.some((e) => e.rep), 'et dans le rapport envoyé à B');
  sync(B, A);
  B.tick();
  film.look(B, 'B lit le rapport de A');
  const b = B.journal.list.find((e) => e.kind === 'combat');
  assert.equal(b.side, 'd');
  assert.deepEqual(b.rep, a.rep, 'B lit le même déroulé');
  assert.equal(explainBattle(b.rep, 'd').outcome, 'loss');
  assert.equal(explainBattle(a.rep, 'a').outcome, 'win');
});

scenario('carnet : une seconde attaque trop tôt dit pourquoi elle ne rapporte rien', (film) => {
  const { A, clock, id, cell } = raid(film);
  film.look(A, 'premier combat : A pille');
  clock.t += 1000;
  A.moveFleet(id, cell, 'attack');
  A.tick();
  film.look(A, 'une seconde plus tard, A attaque encore');
  const last = A.journal.list.filter((e) => e.kind === 'combat').at(-1);
  assert.equal(last.noLoot, 'cooldown');
  assert.match(explainBattle(last.rep, 'a', last).reasons.at(-1), /Pas de butin : tu as déjà pillé/);
});
