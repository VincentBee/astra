// Carnet de combats (D-110) : chaque joueur garde, sur son téléphone, ses
// combats vus de son côté (pertes des deux côtés, butin, planète prise), même
// quand ils sont calculés pendant son absence.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

/** A (humain) en orbite sur la planète de B (machine, 4 drones, 4000 minéraux), qui attaque. */
function raid(kind = 'attack', film) {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const bp = P(B).planet;
  Object.assign(bp, { stock: { minerals: 4000, food: 0, energy: 500 }, ships: { fighter: 4 } });
  bp.levels.store = 3;
  bp.reserve.minerals = bp.nature.minerals.max;
  B.touch();
  sync(A, B);
  const ap = P(A).planet;
  ap.tech = { propulsion: 1, blindage: 1 };
  ap.ships = { fighter: 20, cargo: 20 };
  const cell = { x: A.planets[1].x, y: A.planets[1].y };
  const id = A.takeOff('home', { fighter: 20, cargo: 20 }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  film?.look(A, `la flotte de A en orbite de la planète de B (ordre : ${kind})`);
  A.moveFleet(id, cell, kind);
  A.tick();
  return { A, B, clock, sync };
}

scenario('attaque de planète : les deux carnets ont les pertes des deux côtés et le butin', (film) => {
  const { A, B, sync } = raid('attack', film);
  const a = A.journal.list.find((e) => e.kind === 'combat');
  film.look(A, 'combat : A a abattu les drones et pillé ; son carnet le note', [
    { show: 'carnet de A', expected: 'good', got: a?.tone },
    { show: 'drones de B abattus', expected: 4, got: a?.theirs },
    { show: 'butin', expected: 'des minéraux', got: a?.loot, ok: !!a?.loot.includes('minéraux') },
  ]);
  assert.equal(a.tone, 'good');
  assert.equal(a.theirs, 4, 'les 4 drones de B');
  assert.ok(a.loot.includes('minéraux'), a.loot);
  sync(B, A); // B revient et lit le rapport de A
  B.tick();
  const b = B.journal.list.find((e) => e.kind === 'combat');
  film.look(B, 'B revient et lit le rapport de A : son carnet a le même combat, de son côté', [
    { show: 'carnet de B', expected: 'bad', got: b?.tone },
    { show: 'drones perdus par B', expected: 4, got: b?.mine },
    { show: 'pertes de A, connues de B', expected: a.mine, got: b?.theirs },
    { show: 'pillé chez B', expected: a.loot, got: b?.pillaged },
    { show: 'daté du combat', expected: true, got: b?.at === a.at },
  ]);
  assert.equal(b.tone, 'bad');
  assert.equal(b.mine, 4);
  assert.equal(b.theirs, a.mine, 'B connaît les pertes de A');
  assert.equal(b.pillaged, a.loot, 'B sait ce qu’on lui a pillé');
  assert.equal(b.at, a.at, 'daté du combat, pas de la lecture');
  assert.ok(B.journal.n > B.journal.read, 'neuf pour B (résumé « pendant ton absence »)');
  B.markRead();
  assert.equal(B.journal.read, B.journal.n);
});

scenario('planète prise : le carnet du perdant dit qui l’a prise et qu’il est éliminé', (film) => {
  const { B, sync, A } = raid('conquer', film);
  film.look(A, 'combat : A a pris la planète de B', [{ show: 'prise, dans le carnet de A', expected: true, got: A.journal.list.some((e) => e.capture && e.tone === 'good') }]);
  assert.ok(A.journal.list.some((e) => e.capture && e.tone === 'good'));
  sync(B, A);
  B.tick();
  const texts = B.journal.list.map((e) => e.text);
  film.look(B, 'B lit le rapport : planète perdue, il est éliminé', [
    { show: 'perte, dans le carnet de B', expected: true, got: B.journal.list.some((e) => e.capture && e.tone === 'bad') },
    { show: 'le carnet dit « tu es éliminé »', expected: true, got: texts.some((t) => t.includes('tu es éliminé')) },
  ]);
  assert.ok(B.journal.list.some((e) => e.capture && e.tone === 'bad'), texts.join(' | '));
  assert.ok(texts.some((t) => t.includes('tu es éliminé')), texts.join(' | '));
});

scenario('le carnet reste sur le téléphone : il ne part pas avec la fiche', (film) => {
  const { A } = raid('attack', film);
  film.look(A, 'après le combat : le carnet est rempli, mais pas dans la fiche envoyée aux autres', [
    { show: 'entrées du carnet', expected: 'au moins 1', got: A.journal.list.length, ok: A.journal.list.length > 0 },
    { show: 'carnet dans la fiche envoyée', expected: false, got: JSON.stringify(A.snapshot()).includes('"journal"') },
  ]);
  assert.ok(A.journal.list.length > 0);
  assert.ok(!JSON.stringify(A.snapshot()).includes('"journal"'));
});

// ----- « Ce qui me concerne » ne trahit pas une flotte cachée (D-210, issue #37) -----
// L'ordre d'une flotte (attaque, conquête, poursuite) est marqué de cette flotte au journal partagé :
// la cible ne le lit que si elle voit la flotte (même règle que l'alerte, D-133, et la carte, D-128).

/** Les lignes que le Journal de `s` montre dans « Ce qui me concerne » (même règle que openJournal, js/app.js). */
const concerns = (s) => (s.state.log || []).filter((l) => l.text.includes(P(s).name) && s.showsLog(l)).map((l) => l.text);
const orderOf = (s, words) => concerns(s).filter((t) => t.startsWith(`La flotte ${de(P(s.peer).name)}`) && words.some((w) => t.includes(w)));
const de = (name) => (/^[aeiouyhéèêàâîôû]/i.test(name) ? `d’${name}` : `de ${name}`);

/**
 * A (20 chasseurs, plein d'énergie) arrêté à `dist` cases de la planète mère de B, et un éclaireur
 * de A (1 cargo) à 1 case de cette planète : A voit à qui elle est, donc sa ligne d'ordre nomme B
 * (D-190). B voit l'éclaireur, pas la flotte d'attaque.
 */
function far(dist) {
  const g = newGame(2, ['human', 'human']);
  const [A, B] = g.players;
  const home = { ...P(B).home };
  const sx = home.x < 50 ? 1 : -1;
  const ap = P(A).planet;
  ap.ships = { fighter: 20, cargo: 1 };
  ap.stock = { ...ap.stock, energy: 5000 };
  const scout = A.takeOff('home', { cargo: 1 }, {}, 0);
  const near = { x: home.x + sx, y: home.y };
  Object.assign(A.myFleet(scout), { from: { ...near }, to: { ...near }, fuel: 40 });
  const id = A.takeOff('home', { fighter: 20 }, {}, 0);
  const at = { x: home.x + sx * dist, y: home.y };
  Object.assign(A.myFleet(id), { from: { ...at }, to: { ...at }, fuel: 1000 });
  A.touch();
  g.sync(B, A);
  A.peer = B;
  B.peer = A;
  return { ...g, A, B, id, home };
}

for (const [kind, word] of [['attack', 'attaque'], ['conquer', 'conquérir']]) {
  scenario(`ordre « ${kind} » depuis 19 cases : B ne le lit pas tant qu’il ne voit pas la flotte, A toujours`, (film) => {
    const { A, B, id, home, clock, sync } = far(19);
    assert.ok(A.moveFleet(id, home, kind), 'A donne l’ordre');
    assert.ok(A.state.log.some((l) => l.fleet === id && l.text.includes(`(${P(B).name})`)), 'la ligne nomme B (A voit sa planète par son éclaireur)');
    sync(B, A);
    const f = () => B.state.players[A.me].fleets.find((x) => x.id === id);
    const mark = B.state.log.find((l) => l.text.includes(word));
    film.look(B, `A vient d’ordonner « ${kind} » sur la planète de B, à 19 cases : B ne voit pas la flotte`, [
      { fleet: [A, id], visible: false },
      { show: 'ligne d’ordre dans « Ce qui me concerne » de B', expected: [], got: orderOf(B, [word]) },
      { show: 'marque gardée par la copie de B', expected: { pid: A.me, fleet: id }, got: mark && { pid: mark.pid, fleet: mark.fleet } },
      { show: 'alerte de B', expected: 0, got: B.threats(B.now()).length },
    ]);
    assert.equal(B.sees(B.state.players[A.me], f(), B.now()), false);
    assert.deepEqual(orderOf(B, [word]), []);
    assert.equal(mark?.fleet, id, 'la marque traverse la synchronisation');
    film.look(A, 'A, l’auteur, lit toujours sa ligne d’ordre', [{ show: 'ligne d’ordre chez A', expected: 1, got: concerns(A).filter((t) => t.includes(word)).length }]);
    assert.equal(concerns(A).filter((t) => t.includes(word)).length, 1);

    // La flotte entre dans la portée de la planète de B (3 cases) : l'ordre se lit, comme l'alerte le signale.
    const fa = A.myFleet(id);
    clock.t = fa.depart + ((fa.arrive - fa.depart) * 17) / 19;
    sync(B, A);
    film.look(B, 'la flotte de A est à 2 cases : B la voit, l’alerte sonne, l’ordre se lit', [
      { fleet: [A, id], visible: true },
      { show: 'ligne d’ordre chez B', expected: 1, got: orderOf(B, [word]).length },
      { show: 'alerte de B', expected: 1, got: B.threats(B.now()).length },
    ]);
    assert.equal(orderOf(B, [word]).length, 1);

    // Après le combat, B a le résultat.
    clock.t = fa.arrive + 1000;
    A.tick();
    sync(B, A);
    B.tick();
    const result = concerns(B).filter((t) => t.includes('est attaquée par') || t.includes('prend'));
    film.look(B, 'après le combat : B lit le résultat dans son Journal et son carnet', [
      { show: 'ligne de résultat chez B', expected: 'au moins 1', got: result.length, ok: result.length > 0 },
      { show: 'combat dans le carnet de B', expected: true, got: B.journal.list.some((e) => e.kind === 'combat') },
    ]);
    assert.ok(result.length > 0, concerns(B).join(' | '));
    assert.ok(B.journal.list.some((e) => e.kind === 'combat'));
  });
}

scenario('poursuite : A (radar 3) voit un cargo de B que B ne voit pas venir ; B ne lit pas « prend en chasse »', (film) => {
  const { players: [A, B], sync } = newGame(2, ['human', 'human']);
  A.peer = B;
  B.peer = A;
  const home = { ...P(B).home };
  const sx = home.x < 50 ? 1 : -1;
  const spot = { x: home.x + sx * 12, y: home.y };
  const bp = P(B).planet;
  bp.ships = { cargo: 1 };
  bp.stock = { ...bp.stock, energy: 5000 };
  const cargo = B.takeOff('home', { cargo: 1 }, {}, 0);
  Object.assign(B.myFleet(cargo), { from: { ...spot }, to: { ...spot }, fuel: 40 });
  B.touch();
  const ap = P(A).planet;
  ap.tech = { ...ap.tech, radar: 3 };
  ap.ships = { fighter: 5 };
  ap.stock = { ...ap.stock, energy: 5000 };
  const hunter = A.takeOff('home', { fighter: 5 }, {}, 0);
  const from = { x: spot.x + sx * 4, y: spot.y };
  Object.assign(A.myFleet(hunter), { from: { ...from }, to: { ...from }, fuel: 1000 });
  A.touch();
  sync(A, B);
  sync(B, A);
  assert.ok(A.chaseFleet(hunter, B.me, cargo), 'A lance la poursuite');
  sync(B, A);
  const theirs = B.state.players[A.me].fleets.find((x) => x.id === hunter);
  film.look(B, 'A prend en chasse le cargo de B à 4 cases ; la portée de B n’est que de 2 cases', [
    { fleet: [A, hunter], visible: false },
    { show: '« prend en chasse » chez B', expected: [], got: orderOf(B, ['prend en chasse']) },
  ]);
  assert.equal(B.sees(B.state.players[A.me], theirs, B.now()), false);
  assert.deepEqual(orderOf(B, ['prend en chasse']), []);
  film.look(A, 'A lit sa ligne de poursuite', [{ show: '« prend en chasse » chez A', expected: 1, got: concerns(A).filter((t) => t.includes('prend en chasse')).length }]);
  assert.equal(concerns(A).filter((t) => t.includes('prend en chasse')).length, 1);
});

scenario('une ligne marquée qui arrive par le réseau (onRecord) garde sa marque', () => {
  const { A, B, id, home } = far(19);
  A.moveFleet(id, home, 'attack');
  const entry = A.state.log.find((l) => l.fleet === id);
  B.onRecord(null, A.snapshot().players[A.me], [entry]);
  const got = B.state.log.find((l) => l.text === entry.text);
  assert.deepEqual({ pid: got?.pid, fleet: got?.fleet }, { pid: A.me, fleet: id });
  assert.deepEqual(orderOf(B, ['attaque']), []);
  // Une marque mal formée est ignorée : la ligne redevient une ligne ordinaire.
  B.pushLog({ at: 1, text: `bidon ${P(B).name}`, pid: 3, fleet: {} });
  assert.deepEqual(Object.keys(B.state.log.find((l) => l.text.startsWith('bidon'))), ['at', 'text']);
});
