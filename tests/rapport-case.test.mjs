// Rapports de combat et d'échange visés par leur case (D-360, issue #44) : quand la planète mère
// gèle ou est prise, une colonie devient planète mère (clé « home »). Un rapport encore en attente
// ne doit pas frapper cette nouvelle planète mère, jamais attaquée ; un rapport qui visait la
// colonie promue la frappe bien ; un séquestre d'échange revient à la bonne planète.
import { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

/** Froid actif : il part tout de suite et atteint le soleil en 10 min. */
const frost = () => Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
const me = (s) => s.state.players[s.me];
const name = (s, cell) => s.planets.find((w) => game.sameCell(w, cell))?.name;
const notes = (s) => (s.journal?.list || []).map((e) => e.text);
const logs = (s) => s.state.log.map((l) => l.text);

/** Une flotte de `s` (`ships`, `cargo`) en orbite sur `cell` ; renvoie son identifiant. */
function inOrbit(s, cell, ships, cargo = {}) {
  me(s).planet.ships = { ...(me(s).planet.ships || {}), ...ships };
  const id = s.takeOff('home', { ...ships }, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1e6, cargo: { ...cargo } });
  return id;
}

/** Une colonie de `s` sur la planète `w` (installée à `t`), avec `ships` et `minerals`. */
function colony(s, w, t, ships, minerals) {
  const c = { ...game.newPlanet(s.myRace, t, w), claimAt: t, ships: { ...ships } };
  c.stock = { ...c.stock, minerals };
  me(s).colonies = { ...(me(s).colonies || {}), [w.id]: c };
  return c;
}

/** La planète libre la plus au chaud (elle gèle la dernière). */
function warmest(s) {
  const taken = Object.values(s.state.players).map((p) => p.home);
  return s.planets
    .filter((w) => (!w.kind || w.kind === 'planet') && !taken.some((h) => game.sameCell(h, w)))
    .sort((a, b) => s.frostOf(b) - s.frostOf(a))[0];
}

/**
 * Deux joueurs, froid actif : B (dont la planète mère gèle la première) a une colonie au chaud
 * (4 frégates, 3000 minéraux). A a 30 frégates en orbite de la planète mère de B.
 */
function frostGame() {
  frost();
  const g = newGame(2, ['human', 'machine']);
  const [P, Q] = g.players;
  const [B, A] = P.frostOf(me(P).home) < P.frostOf(me(Q).home) ? [P, Q] : [Q, P];
  const home = { ...me(B).home };
  const w = warmest(B);
  colony(B, w, g.clock.t, { fighter: 4 }, 3000);
  me(B).planet.ships = { fighter: 4 };
  me(B).planet.stock.minerals = 3000;
  B.touch();
  g.sync(A, B);
  return { ...g, A, B, home, w, frozenAt: B.frostOf(home) };
}

scenario('attaque 20 s avant le gel de la planète mère, lue après : la colonie promue ne perd rien, le carnet dit pourquoi', (film) => {
  const { A, B, clock, sync, home, w, frozenAt } = frostGame();
  const a = inOrbit(A, home, { fighter: 30, cargo: 5 });
  clock.t = frozenAt - 20_000;
  A.moveFleet(a, home, 'attack');
  A.tick();
  const effect = (me(A).effects || []).find((e) => e.to === B.me);
  film.look(A, `A attaque ${name(A, home)} (planète mère de B) 20 s avant son gel`, [
    { show: 'rapport de A vers B', expected: 'oui', got: effect ? 'oui' : 'non' },
    { show: 'case du rapport', at: home, expected: JSON.stringify(home), got: JSON.stringify(effect?.cell) },
    { show: 'vaisseaux de B détruits', expected: 'au moins 1', got: effect ? Object.values(effect.ships).reduce((t, n) => t + n, 0) : 0, ok: !!effect && Object.values(effect.ships).some((n) => n > 0) },
  ]);
  assert.ok(effect, 'A a livré un combat');
  assert.deepEqual(effect.cell, home, 'le rapport porte la case visée');
  // B dort : il ne lit la fiche de A que 30 s après le gel.
  sync(B, A);
  clock.t = frozenAt + 30_000;
  const before = game.stateAt(me(B).colonies[w.id], clock.t);
  B.tick();
  const now = me(B).planet;
  film.look(B, `B se réveille : ${name(B, home)} a gelé, ${w.name} devient sa planète mère, puis il lit le rapport de A`, [
    { show: 'planète mère de B', at: w, expected: w.name, got: name(B, me(B).home) },
    { show: `frégates sur ${w.name}`, at: w, expected: 4, got: now.ships.fighter },
    { show: `minéraux sur ${w.name}`, expected: Math.floor(before.stock.minerals), got: Math.floor(now.stock.minerals) },
    { show: 'carnet', expected: `« … ${name(B, home)}, déjà perdue : sans effet. »`, got: notes(B).at(-1), ok: notes(B).at(-1)?.endsWith(`${name(B, home)}, déjà perdue : sans effet.`) },
  ]);
  assert.ok(game.sameCell(me(B).home, w), 'la colonie est devenue planète mère');
  assert.equal(now.ships.fighter, 4, 'la nouvelle planète mère garde ses frégates');
  assert.equal(Math.floor(now.stock.minerals), Math.floor(before.stock.minerals), 'et son stock');
  assert.ok(B.state.players[B.me].applied.includes(effect.id), 'le rapport est lu (pas relu au passage suivant)');
  assert.match(notes(B).join('\n'), new RegExp(`${A.name} attaque ${name(B, home)}, déjà perdue : sans effet\\.`));
  assert.match(logs(B).join('\n'), new RegExp(`Rapport de ${A.name} sans effet : ${name(B, home)} n’est plus à ${B.name}`));
  assert.doesNotMatch(logs(B).join('\n'), new RegExp(`${w.name} \\(${B.name}\\) est attaquée`));
});

scenario('témoin : la même attaque lue avant le gel abîme la planète mère, pas la colonie', (film) => {
  const { A, B, clock, sync, home, w, frozenAt } = frostGame();
  const a = inOrbit(A, home, { fighter: 30, cargo: 5 });
  clock.t = frozenAt - 20_000;
  A.moveFleet(a, home, 'attack');
  A.tick();
  sync(B, A);
  clock.t = frozenAt - 10_000;
  B.tick();
  film.look(B, 'B lit le rapport avant le gel : sa planète mère perd des frégates, la colonie rien', [
    { show: `frégates sur ${name(B, home)}`, at: home, expected: 'moins de 4', got: me(B).planet.ships.fighter || 0, ok: (me(B).planet.ships.fighter || 0) < 4 },
    { show: `frégates sur ${w.name}`, at: w, expected: 4, got: me(B).colonies[w.id].ships.fighter },
  ]);
  assert.ok((me(B).planet.ships.fighter || 0) < 4);
  assert.equal(me(B).colonies[w.id].ships.fighter, 4);
});

/**
 * Trois joueurs, sans froid : B (p1) a sa planète mère et une colonie (4 frégates, 3000 minéraux).
 * A et D ont chacun une flotte en orbite de la planète mère de B.
 */
function threeGame() {
  const g = newGame(3, ['human', 'machine', 'alien']);
  const [D, B, A] = g.players; // D = p0 : il passe avant A dans la copie de B (l'ancien ordre de lecture)
  const home = { ...me(B).home };
  const w = warmest(B);
  colony(B, w, g.clock.t, { fighter: 4 }, 3000);
  me(B).planet.ships = { fighter: 4 };
  me(B).planet.stock.minerals = 3000;
  B.touch();
  for (const s of [A, D]) g.sync(s, B);
  return { ...g, A, B, D, home, w };
}

scenario('3 joueurs : pillage à t+5 s puis prise à t+10 s pendant l’absence de B : la colonie promue ne perd rien', (film) => {
  const { A, B, D, clock, sync, home, w } = threeGame();
  const a = inOrbit(A, home, { fighter: 30, cargo: 5 });
  const d = inOrbit(D, home, { fighter: 80 });
  const t0 = clock.t;
  clock.t = t0 + 5000;
  A.moveFleet(a, home, 'attack');
  A.tick();
  clock.t = t0 + 10_000;
  D.moveFleet(d, home, 'conquer');
  D.tick();
  const pillage = me(A).effects.find((e) => e.to === B.me);
  const capture = me(D).effects.find((e) => e.to === B.me && e.capture);
  film.look(D, `A pille ${name(D, home)} à t+5 s, D la prend à t+10 s ; B est absent`, [
    { show: 'pillage de A', expected: 'oui', got: pillage ? 'oui' : 'non' },
    { show: 'prise de D', at: home, expected: 'oui', got: capture ? 'oui' : 'non' },
  ]);
  assert.ok(pillage && capture);
  // B reçoit les deux fiches et lit tout d'un coup. Sa copie range D (p0) avant A (p2).
  sync(B, D);
  sync(B, A);
  clock.t = t0 + 60_000;
  const before = game.stateAt(me(B).colonies[w.id], clock.t);
  B.tick();
  const now = me(B).planet;
  film.look(B, `B lit les deux rapports dans l’ordre de leur heure : pillage, puis prise ; ${w.name} devient sa planète mère`, [
    { show: 'planète mère de B', at: w, expected: w.name, got: name(B, me(B).home) },
    { show: `frégates sur ${w.name}`, at: w, expected: 4, got: now.ships.fighter },
    { show: `minéraux sur ${w.name}`, expected: Math.floor(before.stock.minerals), got: Math.floor(now.stock.minerals) },
    { show: 'ordre du carnet', expected: `${A.name} attaque ${name(B, home)}. / ${D.name} prend ${name(B, home)}.`, got: notes(B).filter((t) => /attaque|prend/.test(t)).join(' / ') },
  ]);
  assert.ok(game.sameCell(me(B).home, w));
  assert.equal(now.ships.fighter, 4, 'la colonie promue garde ses frégates');
  assert.equal(Math.floor(now.stock.minerals), Math.floor(before.stock.minerals), 'et son stock');
  const order = notes(B).filter((t) => /attaque|prend/.test(t));
  assert.deepEqual(order.slice(0, 2), [`${A.name} attaque ${name(B, home)}.`, `${D.name} prend ${name(B, home)}.`], 'dans l’ordre des heures');
});

/** A prend la planète mère de B et attaque sa colonie (`first` : lequel des deux combats a lieu d'abord). */
function captureAndRaid(first, film) {
  const g = newGame(2, ['human', 'machine']);
  const [B, A] = g.players;
  const home = { ...me(B).home };
  const w = warmest(B);
  colony(B, w, g.clock.t, { fighter: 10 }, 1000);
  me(B).planet.ships = { fighter: 2 };
  B.touch();
  g.sync(A, B);
  const c = inOrbit(A, home, { fighter: 60 });
  const r = inOrbit(A, w, { fighter: 60, cargo: 10 });
  const t0 = g.clock.t;
  const steps = { capture: () => A.moveFleet(c, home, 'conquer'), raid: () => A.moveFleet(r, w, 'attack') };
  const order = first === 'capture' ? ['capture', 'raid'] : ['raid', 'capture'];
  for (const [i, k] of order.entries()) {
    g.clock.t = t0 + 1000 * (i + 1);
    steps[k]();
    A.tick();
  }
  const raid = me(A).effects.find((e) => e.to === B.me && !e.capture);
  film.look(A, `A : ${order.map((k) => (k === 'capture' ? `prend ${name(A, home)}` : `attaque ${w.name}`)).join(', puis ')}`, [
    { show: 'rapport d’attaque de la colonie', at: w, expected: JSON.stringify({ x: w.x, y: w.y }), got: JSON.stringify(raid?.cell) },
  ]);
  g.sync(B, A);
  g.clock.t = t0 + 30_000;
  const before = game.stateAt(me(B).colonies[w.id], g.clock.t);
  B.tick();
  return { ...g, A, B, home, w, raid, before };
}

for (const first of ['capture', 'raid']) {
  scenario(`une attaque de la colonie promue planète mère la frappe bien (${first === 'capture' ? 'prise puis attaque' : 'attaque puis prise'})`, (film) => {
    const { B, w, raid, before } = captureAndRaid(first, film);
    const now = me(B).planet;
    const lost = raid.ships.fighter || 0;
    const took = raid.take.minerals || 0;
    film.look(B, `B lit : sa planète mère est prise, ${w.name} la remplace et encaisse l’attaque`, [
      { show: 'planète mère de B', at: w, expected: w.name, got: name(B, me(B).home) },
      { show: `frégates sur ${w.name}`, at: w, expected: 10 - lost, got: now.ships.fighter || 0 },
      { show: `minéraux sur ${w.name}`, expected: Math.floor(before.stock.minerals - took), got: Math.floor(now.stock.minerals) },
      { show: 'carnet', expected: `J1 attaque ${w.name}.`, got: notes(B).find((t) => t.includes(`attaque ${w.name}`)) || '(rien)' },
    ]);
    assert.ok(lost > 0 && took > 0, 'le combat a tué et pillé');
    assert.ok(game.sameCell(me(B).home, w));
    assert.equal(now.ships.fighter || 0, 10 - lost, 'les pertes tombent sur la colonie promue');
    assert.equal(Math.floor(now.stock.minerals), Math.floor(before.stock.minerals - took), 'le pillage aussi');
    assert.ok(notes(B).some((t) => t === `J1 attaque ${w.name}.`), 'le carnet note le combat');
  });
}

scenario('une flotte posée sur la planète mère, attaquée avant le gel, rapport lu après : la nouvelle planète mère ne perd rien', (film) => {
  const { A, B, clock, sync, home, w, frozenAt } = frostGame();
  // B pose une flotte de 6 frégates sur sa planète mère (un vrai « se poser ») ; A l'avait attaquée en vol.
  const f = inOrbit(B, home, { fighter: 6 });
  clock.t = frozenAt - 30_000;
  B.moveFleet(f, home, 'dock');
  B.tick();
  film.look(B, `B pose 6 frégates sur ${name(B, home)}`, [{ show: 'posée sur', at: home, expected: w.id === me(B).docked[f] ? '?' : 'l’identifiant de la planète', got: me(B).docked[f] === B.planets.find((x) => game.sameCell(x, home)).id ? 'l’identifiant de la planète' : me(B).docked[f] }]);
  assert.equal(me(B).docked[f], B.planets.find((x) => game.sameCell(x, home)).id, 'docked garde l’identifiant de la planète, pas « home »');
  me(A).effects = [...(me(A).effects || []), { id: 'hit-f', to: B.me, fleet: f, by: 'x', at: frozenAt - 40_000, ships: { fighter: 4 }, take: {} }];
  A.touch();
  sync(B, A);
  clock.t = frozenAt + 30_000;
  B.tick();
  film.look(B, `${name(B, home)} a gelé : ${w.name} devient planète mère ; le rapport contre la flotte posée ne la touche pas`, [
    { show: `frégates sur ${w.name}`, at: w, expected: 4, got: me(B).planet.ships.fighter },
    { show: 'carnet', expected: `« … ${name(B, home)}, déjà perdue : sans effet. »`, got: notes(B).at(-1), ok: notes(B).at(-1)?.endsWith(`${name(B, home)}, déjà perdue : sans effet.`) },
  ]);
  assert.ok(game.sameCell(me(B).home, w));
  assert.equal(me(B).planet.ships.fighter, 4, 'la nouvelle planète mère garde ses frégates');
  assert.match(notes(B).at(-1), /déjà perdue : sans effet/);
});

scenario('une ancienne fiche (« home » dans docked) : réécrite au gel, le rapport ne frappe pas la nouvelle planète mère', (film) => {
  const { A, B, clock, sync, home, w, frozenAt } = frostGame();
  me(B).docked = { old: 'home' };
  me(A).effects = [{ id: 'hit-old', to: B.me, fleet: 'old', by: 'x', at: frozenAt - 40_000, ships: { fighter: 4 }, take: {} }];
  A.touch();
  sync(B, A);
  clock.t = frozenAt + 30_000;
  B.tick();
  film.look(B, 'la référence « home » de la flotte posée vise l’ancienne planète mère', [
    { show: `frégates sur ${w.name}`, at: w, expected: 4, got: me(B).planet.ships.fighter },
    { show: 'docked', expected: B.planets.find((x) => game.sameCell(x, home)).id, got: me(B).docked.old },
  ]);
  assert.equal(me(B).planet.ships.fighter, 4);
  assert.equal(me(B).docked.old, B.planets.find((x) => game.sameCell(x, home)).id);
});

/** B propose 500 minéraux (contre `want`) depuis sa colonie à une flotte de A en orbite ; puis la planète mère de B gèle. */
function tradeThenFrost(from, want) {
  const g = frostGame();
  const { A, B, clock, sync, home, w } = g;
  const cell = from === 'colony' ? w : home;
  const a = inOrbit(A, cell, { cargo: 5 }, { food: 300 });
  A.myFleet(a).fuel = 10; // des réservoirs pas pleins : la place pour l'échange
  sync(B, A);
  clock.t = g.frozenAt - 60_000;
  const ref = { planet: from === 'colony' ? w.id : 'home' };
  const id = B.proposeTrade(ref, { pid: A.me, fleet: a }, { minerals: 500 }, want);
  assert.ok(id, 'offre faite');
  sync(A, B);
  clock.t = g.frozenAt + 10_000;
  B.tick(); // la planète mère gèle : la colonie devient planète mère
  sync(A, B);
  return { ...g, a, id };
}

scenario('échange depuis une colonie promue planète mère, refusé : tout le séquestre revient à cette planète', (film) => {
  const { A, B, clock, sync, w, id } = tradeThenFrost('colony', {});
  assert.ok(game.sameCell(me(B).home, w), 'la colonie est devenue planète mère');
  A.answerTrade(B.me, id, false);
  sync(B, A);
  clock.t += 1000;
  const before = game.stateAt(me(B).planet, clock.t).stock.minerals;
  B.tick();
  const after = me(B).planet.stock.minerals;
  film.look(B, `A refuse : les 500 minéraux reviennent sur ${w.name}`, [
    { show: `minéraux rendus à ${w.name}`, at: w, expected: 500, got: Math.round(after - before) },
    { show: 'journal', expected: '« … récupère sa part. »', got: logs(B).at(-1), ok: /récupère sa part\.$/.test(logs(B).at(-1)) },
  ]);
  assert.equal(Math.round(after - before), 500);
  assert.match(logs(B).join('\n'), /sans suite : J\d récupère sa part\./);
});

scenario('échange depuis une colonie promue planète mère, accepté : ce qui était demandé arrive sur cette planète', (film) => {
  const { A, B, clock, sync, w, id } = tradeThenFrost('colony', { food: 200 });
  const ok = A.answerTrade(B.me, id, true);
  sync(B, A);
  clock.t += 1000;
  const before = game.stateAt(me(B).planet, clock.t).stock.food;
  B.tick();
  const after = me(B).planet.stock.food;
  film.look(B, `A accepte : les 200 nourritures arrivent sur ${w.name}`, [
    { show: 'A accepte', expected: true, got: ok },
    { show: `nourriture reçue sur ${w.name}`, at: w, expected: 200, got: Math.round(after - before) },
  ]);
  assert.equal(ok, true);
  assert.equal(Math.round(after - before), 200);
});

scenario('échange depuis la planète mère qui gèle pendant l’attente, refusé : le séquestre est perdu, le journal le dit', (film) => {
  const { A, B, clock, sync, home, w, id } = tradeThenFrost('home', {});
  A.answerTrade(B.me, id, false);
  sync(B, A);
  clock.t += 1000;
  const before = game.stateAt(me(B).planet, clock.t).stock.minerals;
  B.tick();
  const after = me(B).planet.stock.minerals;
  film.look(B, `A refuse : les 500 minéraux étaient sur ${name(B, home)}, gelée ; ${w.name} ne les reçoit pas`, [
    { show: `minéraux reçus par ${w.name}`, at: w, expected: 0, got: Math.round(after - before) },
    { show: 'journal', expected: `« … séquestre de J… perdu avec ${name(B, home)}. »`, got: logs(B).at(-1), ok: logs(B).at(-1)?.endsWith(`perdu avec ${name(B, home)}.`) },
  ]);
  assert.equal(Math.round(after - before), 0, 'la nouvelle planète mère ne reçoit pas un séquestre qui n’était pas le sien');
  assert.match(logs(B).at(-1), new RegExp(`séquestre .*perdu avec ${name(B, home)}\\.`));
});

scenario('« Conquérir » en vol vers une colonie devenue planète mère pendant le trajet : la flotte la combat et la prend (jeu-solo-01)', (film) => {
  const g = newGame(2, ['human', 'machine']);
  const [B, A] = g.players;
  const home = { ...me(B).home };
  const w = warmest(B);
  colony(B, w, g.clock.t, { fighter: 2 }, 1000);
  me(B).planet.ships = { fighter: 2 };
  B.touch();
  g.sync(A, B);
  // F2 part vers la colonie (un vrai trajet), F1 est déjà en orbite de la planète mère.
  me(A).planet.ships = { fighter: 60 };
  const f2 = A.takeOff('home', { fighter: 60 }, {}, 0);
  A.myFleet(f2).fuel = 1e6;
  A.moveFleet(f2, w, 'conquer');
  const order = { ...A.myFleet(f2).order };
  const f1 = inOrbit(A, home, { fighter: 60 });
  g.clock.t += 1000;
  A.moveFleet(f1, home, 'conquer');
  A.tick();
  // B lit la prise : sa colonie devient planète mère ; A reçoit la fiche de B à jour.
  g.sync(B, A);
  g.clock.t += 1000;
  B.tick();
  g.sync(A, B);
  film.look(A, `F1 a pris ${name(A, home)} ; ${w.name} est devenue la planète mère de B ; F2 vole encore vers elle`, [
    { show: 'ordre de F2', expected: `conquer, clé ${w.id}`, got: `${order.kind}, clé ${order.key}` },
    { show: 'planète mère de B, vue par A', at: w, expected: w.name, got: name(A, A.state.players[B.me].home) },
  ]);
  assert.equal(order.key, w.id, 'l’ordre visait la colonie par sa clé');
  assert.ok(game.sameCell(A.state.players[B.me].home, w));
  g.clock.t = A.myFleet(f2).arrive + 10;
  A.tick();
  const cap = me(A).effects.filter((e) => e.to === B.me && e.capture && game.sameCell(e.cell, w));
  film.look(A, `F2 arrive : elle combat ${w.name} et la prend`, [
    { show: 'à qui', at: w, expected: 'A', got: A.ownerAt(w)?.id === A.me ? 'A' : A.ownerAt(w)?.id === B.me ? 'B' : 'personne' },
    { show: 'rapport de prise', expected: 1, got: cap.length },
  ]);
  assert.equal(A.ownerAt(w)?.id, A.me, 'la colonie promue est prise');
  assert.equal(cap.length, 1);
  // B lit la prise : par la case, elle tombe sur sa planète mère (clé « home ») ; il n'a plus rien.
  g.sync(B, A);
  g.clock.t += 1000;
  B.tick();
  film.look(B, `B lit : ${w.name} (sa planète mère) est prise, il est éliminé`, [{ show: 'B éliminé', expected: true, got: Number.isFinite(me(B).out) }]);
  assert.ok(Number.isFinite(me(B).out), 'B est éliminé');
});
