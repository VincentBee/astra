// Navette (D-540 à D-546) : une flotte de cargos fait seule des allers-retours entre deux de mes
// planètes. Elle charge sur A ce que ses soutes peuvent prendre, le pose sur B, revient à vide.
// Écrits en scénarios (D-129) : en cas d'échec, tests/reports/navette.test.html montre la carte.
import assert from 'node:assert/strict';
import { newGame, game, fleet, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { replay, replayable, comparable } = await import('../js/replay.js');
const { normalize } = await import('../js/session.js');

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];
const MIN = 60_000;

/**
 * Une partie où A (machines) a sa planète mère et une colonie à 6 cases, et une flotte de
 * cargos en orbite de sa planète mère. Le sol ne donne plus rien (réserve et repousse à 0) :
 * les minéraux ne naissent ni ne disparaissent, seule la navette les déplace.
 */
function setup({ n = 1, home = 3000, colony = 100, store = 6, ships = { cargo: 2 } } = {}) {
  const g = newGame(n, ['machine', 'human']);
  const [A] = g.players;
  const p = P(A);
  const w = A.planets
    .filter((x) => !game.sameCell(x, p.home) && (!x.kind || x.kind === 'planet') && !g.players.some((s) => game.sameCell(x, P(s).home)))
    .sort((a, b) => game.distance(a, p.home) - game.distance(b, p.home) || (a.id < b.id ? -1 : 1))[0];
  const col = game.newPlanet('machine', g.clock.t, w);
  Object.assign(col, { claimAt: g.clock.t, tech: { ...p.planet.tech } });
  p.colonies = { ...(p.colonies || {}), [w.id]: col };
  for (const pl of [p.planet, col]) {
    for (const r of game.SOIL) if (pl.nature?.[r]) Object.assign(pl.nature[r], { regen: 0 }), (pl.reserve[r] = 0);
  }
  p.planet.stock = { ...p.planet.stock, minerals: home, food: 0, energy: 20_000 };
  p.planet.levels.store = 6; // entrepôt de la planète mère assez grand pour son stock
  col.stock = { ...col.stock, minerals: colony, food: 0, energy: 20_000 };
  col.levels.store = store;
  p.planet.ships = { ...ships };
  A.touch();
  const id = A.takeOff('home', ships, {}, 30);
  for (const s of g.players) for (const o of g.players) if (s !== o) g.sync(s, o);
  return { ...g, A, p, col, w, B: { x: w.x, y: w.y }, home: { ...p.home }, id };
}

/** Minéraux de A, de B et dans les soutes, à l'heure de l'horloge. */
function minerals(A, col, id, t) {
  const a = game.stateAt(P(A).planet, t).stock.minerals;
  const b = game.stateAt(col, t).stock.minerals;
  const c = A.myFleet(id)?.cargo?.minerals || 0;
  return { a, b, c, total: a + b + c };
}

function run(s, clock, done, step = 1000, max = 600) {
  for (let i = 0; i < max && !done(); i++) {
    clock.t += step;
    s.tick();
  }
}

scenario('navette : plusieurs allers-retours de A vers B ; A baisse, B monte, rien ne se crée ni ne se perd', (film) => {
  const { A, clock, col, id, home, B } = setup();
  const before = minerals(A, col, id, clock.t);
  film.look(A, 'A : 3 000 minéraux sur sa planète mère, 100 sur sa colonie, 2 cargos (800 de soute) en orbite');
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  const o = A.myFleet(id).order;
  assert.equal(o.kind, 'shuttle');
  assert.equal(A.myFleet(id).cargo.minerals, 800, 'elle charge tout de suite, soutes pleines');
  assert.ok(fleet.moving(A.myFleet(id), clock.t + 1), 'et part vers B');
  film.look(A, 'navette réglée depuis la fiche de la flotte : elle charge 800 et part vers la colonie', [
    { show: 'ordre', at: [A, id], expected: 'shuttle', got: o.kind },
    { show: 'soute', at: [A, id], expected: 800, got: A.myFleet(id).cargo.minerals },
  ]);
  run(A, clock, () => A.myFleet(id).order.trips >= 3);
  const after = minerals(A, col, id, clock.t);
  film.look(A, 'trois livraisons plus tard', [
    { show: 'livraisons', expected: 3, got: A.myFleet(id).order.trips },
    { show: 'minéraux livrés', expected: 2400, got: A.myFleet(id).order.sent.minerals },
    { show: 'somme A + B + soutes', expected: before.total, got: after.total, ok: Math.abs(after.total - before.total) < 1e-6 },
  ]);
  assert.equal(A.myFleet(id).order.trips, 3);
  assert.equal(A.myFleet(id).order.sent.minerals, 2400);
  assert.ok(after.b >= 100 + 2400, `B monte : ${after.b}`);
  assert.ok(after.a <= 3000 - 2400, `A baisse : ${after.a}`);
  assert.ok(Math.abs(after.total - before.total) < 1e-6, `somme conservée : ${before.total} → ${after.total}`);
  // Le journal partagé ne reçoit pas une ligne par trajet (40 lignes au plus) : seulement le départ.
  assert.equal(A.state.log.filter((l) => l.text.includes('navette')).length, 1);
});

scenario('navette, longue absence : au retour, tous les trajets dus sont faits d’un coup, sans stock négatif ni débordement', (film) => {
  const { A, clock, col, id, home, B } = setup({ home: 20_000 });
  const before = minerals(A, col, id, clock.t);
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  film.look(A, 'navette réglée : 20 000 minéraux à faire passer, 800 par voyage');
  clock.t += 2 * 60 * MIN; // deux heures sans ouvrir l'appli
  A.tick(); // un seul passage au retour
  const f = A.myFleet(id);
  const after = minerals(A, col, id, clock.t);
  film.look(A, 'deux heures plus tard, un seul passage : 25 voyages faits, A vide, la navette attend sur A', [
    { show: 'livraisons', expected: 25, got: f.order.trips },
    { show: 'minéraux sur A', expected: 0, got: after.a },
    { show: 'minéraux sur B', expected: 20_100, got: after.b },
    { show: 'attend', at: [A, id], expected: 'a', got: f.order.wait },
  ]);
  assert.equal(f.order.trips, 25, 'les 25 voyages dus');
  assert.equal(after.a, 0, 'A vidée, jamais négative');
  assert.equal(after.b, 20_100);
  assert.equal(f.order.wait, 'a', 'plus rien à charger : elle attend sur A');
  assert.ok(Math.abs(after.total - before.total) < 1e-6);
  // En attente, un passage ne change rien : pas d'entrée au journal d'ordres.
  const n = P(A).orders.length;
  for (let i = 0; i < 20; i++) (clock.t += 1000), A.tick();
  assert.equal(P(A).orders.length, n, 'attendre ne remplit pas le journal d’ordres');
});

scenario('navette, longue absence : l’entrepôt de B se remplit, le reste attend dans les soutes, sur B', (film) => {
  // Entrepôt de B au niveau 0 : 1 000 au plus.
  const { A, clock, col, id, home, B } = setup({ home: 5000, colony: 100, store: 0 });
  const before = minerals(A, col, id, clock.t);
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  clock.t += 60 * MIN;
  A.tick();
  const f = A.myFleet(id);
  const after = minerals(A, col, id, clock.t);
  const cap = game.stateAt(col, clock.t).prod.caps.minerals;
  film.look(A, 'une heure plus tard : B est pleine, la navette attend sur B avec ce qui ne rentre pas', [
    { show: 'minéraux sur B', expected: cap, got: after.b },
    { show: 'soute', at: [A, id], expected: 'de 1 à 800', got: after.c, ok: after.c > 0 && after.c <= 800 },
    { show: 'attend', at: [A, id], expected: 'b', got: f.order.wait },
  ]);
  assert.equal(cap, 1000);
  assert.equal(after.b, cap, 'B remplie jusqu’à son entrepôt, pas au-delà');
  assert.equal(f.order.wait, 'b');
  assert.ok(after.c > 0 && after.c <= fleet.fleetCargo('machine', f.ships), 'le reste dans les soutes, sans les dépasser');
  assert.ok(after.a >= 0);
  assert.ok(Math.abs(after.total - before.total) < 1e-6, 'rien de perdu');
  // 100 + 800 (une livraison complète), puis 100 posés sur 800 : ce reste n'est pas une livraison de plus.
  assert.equal(f.order.trips, 1, 'une seule livraison complète');
  assert.equal(f.order.sent.minerals, 900);
  // Un peu de place (moins d'un lot) : elle attend encore, sans écrire au journal d'ordres.
  const n = P(A).orders.length;
  col.stock.minerals = cap - 40;
  A.tick();
  assert.equal(A.myFleet(id).order.wait, 'b');
  assert.equal(P(A).orders.length, n, 'pas une entrée par passage pour 40 de place');
  // B consomme de nouveau de la place : elle décharge et repart.
  col.stock.minerals = 0;
  A.tick();
  assert.equal(A.myFleet(id).order.wait, undefined, 'de la place sur B : elle décharge et repart');
});

scenario('navette : un autre ordre l’arrête, avec sa ligne au journal', (film) => {
  const { A, clock, id, home, B } = setup();
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  run(A, clock, () => A.myFleet(id).order.trips >= 1);
  assert.ok(A.moveFleet(id, { x: 0, y: 0 }));
  film.look(A, 'A envoie la flotte ailleurs : la navette s’arrête', [{ show: 'ordre', at: [A, id], expected: 'rien', got: A.myFleet(id).order?.kind ?? null, ok: !A.myFleet(id).order }]);
  assert.equal(A.myFleet(id).order, null);
  assert.ok(A.state.log.some((l) => l.text.includes('s’arrête : nouvel ordre')));
  // L'arrêt de la flotte et l'arrêt demandé finissent aussi la navette.
  const g = setup();
  assert.ok(g.A.shuttleFleet(g.id, g.home, g.B, ['minerals']));
  assert.ok(g.A.stopFleet(g.id));
  assert.equal(g.A.myFleet(g.id).order, null);
  assert.ok(g.A.state.log.some((l) => l.text.includes('s’arrête : flotte arrêtée')));
  const h = setup();
  assert.ok(h.A.shuttleFleet(h.id, h.home, h.B, ['minerals']));
  // La régler autrement en route (ici : nourriture en plus) ne la fait pas faire demi-tour.
  const leg = { to: { ...h.A.myFleet(h.id).to }, arrive: h.A.myFleet(h.id).arrive };
  assert.ok(h.A.shuttleFleet(h.id, h.home, h.B, ['minerals', 'food']));
  assert.deepEqual({ to: h.A.myFleet(h.id).to, arrive: h.A.myFleet(h.id).arrive }, leg, 'même trajet');
  assert.deepEqual(h.A.myFleet(h.id).order.res, ['minerals', 'food']);
  assert.equal(h.A.myFleet(h.id).order.go, 'b');
  assert.ok(h.A.shuttleFleet(h.id), 'arrêter la navette');
  assert.equal(h.A.myFleet(h.id).order, null);
  assert.ok(fleet.moving(h.A.myFleet(h.id), h.clock.t + 1), 'elle finit son trajet');
  assert.ok(h.A.state.log.some((l) => l.text.includes('s’arrête : à la demande de son joueur')));
});

scenario('navette : une planète perdue ou une flotte sans cargo l’arrête', (film) => {
  const { A, clock, p, w, id, home, B } = setup();
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  A.losePlanet(p, w.id, clock.t, 'test');
  run(A, clock, () => !A.myFleet(id).order);
  film.look(A, 'la colonie est perdue : à la prochaine escale, la navette s’arrête', [{ show: 'ordre', at: [A, id], expected: 'rien', got: A.myFleet(id).order?.kind ?? null, ok: !A.myFleet(id).order }]);
  assert.equal(A.myFleet(id).order, null);
  assert.ok(A.state.log.some((l) => l.text.includes(`s’arrête : ${w.name} n’est plus à`)));

  const g = setup();
  assert.ok(g.A.shuttleFleet(g.id, g.home, g.B, ['minerals']));
  g.A.myFleet(g.id).ships = { fighter: 1 }; // plus de cargo (une fiche d'avant, un vaisseau perdu…)
  run(g.A, g.clock, () => !g.A.myFleet(g.id).order);
  assert.equal(g.A.myFleet(g.id).order, null);
  assert.ok(g.A.state.log.some((l) => l.text.includes('plus aucun cargo')));
});

scenario('navette : un combat l’arrête (attaquée, la flotte survit et finit son trajet sans navette)', (film) => {
  const { A, clock, sync, players: [, H], id, home, B } = setup({ n: 2, ships: { cargo: 6 } });
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  // H (humains) envoie une seule frégate sur la navette : six cargos (72 de coque) y survivent.
  const hp = P(H);
  hp.planet.ships = { fighter: 1 };
  hp.planet.stock = { ...hp.planet.stock, energy: 5000 };
  H.touch();
  const hid = H.takeOff('home', { fighter: 1 }, {}, 40);
  Object.assign(H.myFleet(hid), { from: { ...home }, to: { ...home } });
  H.touch();
  sync(H, A);
  assert.ok(H.chaseFleet(hid, A.me, id));
  sync(A, H);
  for (let i = 0; i < 60 && A.myFleet(id)?.order; i++) {
    clock.t += 1000;
    H.tick();
    sync(A, H);
    A.tick();
    sync(H, A);
  }
  const f = A.myFleet(id);
  film.look(A, 'H attaque la navette avec une frégate : la flotte survit, la navette s’arrête', [
    { show: 'flotte', at: [A, id], expected: 'là', got: f ? 'là' : 'détruite' },
    { show: 'navette', at: [A, id], expected: 'arrêtée', got: f?.order ? 'en cours' : 'arrêtée', ok: !!f && !f.order },
  ]);
  assert.ok(f, 'la flotte survit');
  assert.equal(f.order, null, 'plus de navette');
  assert.ok(A.state.log.some((l) => /navette .* s’arrête : attaquée par J1/.test(l.text)), 'au journal');
});

scenario('navette : une navette agressive et armée qui livre combat s’arrête aussi', (film) => {
  const { A, sync, players: [, H], id, home, B } = setup({ n: 2, ships: { cargo: 2, fighter: 2 } });
  // Un cargo de H attend sur la planète mère de A, là où passe la navette.
  const hp = P(H);
  hp.planet.ships = { cargo: 1 };
  hp.planet.stock = { ...hp.planet.stock, energy: 5000 };
  H.touch();
  const hid = H.takeOff('home', { cargo: 1 }, {}, 10);
  Object.assign(H.myFleet(hid), { from: { ...home }, to: { ...home } });
  H.touch();
  sync(A, H);
  assert.ok(A.shuttleFleet(id, home, B, ['minerals']));
  assert.ok(A.setFleetStance(id, 'aggressive'), 'agressive : elle combat le cargo de H à son contact');
  film.look(A, 'la navette armée devient agressive : elle combat, la navette s’arrête', [{ show: 'navette', at: [A, id], expected: 'arrêtée', got: A.myFleet(id)?.order ? 'en cours' : 'arrêtée', ok: !A.myFleet(id)?.order }]);
  assert.equal(A.myFleet(id).order, null);
  assert.ok(A.state.log.some((l) => /navette .* s’arrête : combat contre J1/.test(l.text)));
});

scenario('navette invalide : refusée (planète d’un autre, ressource inconnue, pas de cargo), ou nettoyée à la lecture', (film) => {
  const { A, players: [, H], id, home, B } = setup({ n: 2 });
  const toasts = [];
  A.ontoast = (m) => toasts.push(m);
  const theirs = { ...P(H).home };
  assert.equal(A.shuttleFleet(id, home, theirs, ['minerals']), false, 'planète d’un autre joueur');
  assert.equal(A.shuttleFleet(id, home, { x: 0, y: 0 }, ['minerals']), false, 'case sans planète à moi');
  assert.equal(A.shuttleFleet(id, home, home, ['minerals']), false, 'A et B la même');
  assert.equal(A.shuttleFleet(id, home, B, ['energy']), false, 'l’énergie ne voyage pas en soute');
  assert.equal(A.shuttleFleet(id, home, B, ['gold']), false, 'ressource inconnue');
  assert.equal(A.shuttleFleet(id, home, B, []), false, 'aucune ressource');
  film.look(A, 'six navettes impossibles : refusées, la flotte ne bouge pas', [{ show: 'refus', expected: 6, got: toasts.length }]);
  assert.equal(toasts.length, 6);
  assert.equal(A.myFleet(id).order, null);
  // Une flotte sans cargo (des drones d'assaut ont un peu de soute, pas assez) : refusée aussi.
  P(A).planet.ships = { fighter: 2 };
  const fid = A.takeOff('home', { fighter: 2 }, {}, 10);
  assert.equal(A.shuttleFleet(fid, home, B, ['minerals']), false, 'pas de cargo');
  // Une fiche abîmée : la navette tombe à la lecture, la flotte reste.
  const bad = clone(P(A));
  bad.fleets[0].order = { kind: 'shuttle', a: home, b: B, res: ['gold'], go: 'a' };
  bad.fleets.push({ ...clone(bad.fleets[0]), id: 'x2', order: { kind: 'shuttle', a: home, b: 'B', res: ['minerals'], go: 'a' } });
  bad.fleets.push({ ...clone(bad.fleets[0]), id: 'x3', order: { kind: 'shuttle', a: home, b: B, res: ['minerals', 'minerals'], go: 'b', trips: -4, sent: { minerals: -1, gold: 9 }, wait: 'z' } });
  const ok = normalize(bad);
  const of = (fid) => ok.fleets.find((f) => f.id === fid).order;
  assert.equal(of(id), null);
  assert.equal(of('x2'), null);
  assert.deepEqual(of('x3'), { kind: 'shuttle', a: home, b: B, res: ['minerals'], go: 'b', trips: 0, sent: {} });
  assert.equal(comparable(normalize(clone(ok))), comparable(ok), 'nettoyer deux fois ne change rien');
});

scenario('navette : le rejeu des journaux redonne la même fiche (escales, attente, absence, arrêt)', (film) => {
  // Partie jouée seulement par des ordres, comme depuis l'appli : un fil de construction donne
  // un colonisateur et deux cargos, le colon fonde une colonie, les cargos font la navette.
  const { players: [A], clock } = newGame(1, ['machine']);
  const p = P(A);
  const plan = ['reactor', 'drill', 'reactor', 'store', 'lab', 'lab', 'yard', { t: 'ions' }, { t: 'ions' }, { t: 'replication' }, { s: 'colony', n: 1 }, { s: 'cargo', n: 2 }];
  for (const x of plan) typeof x === 'string' ? A.planBuild(x) : x.t ? A.planResearch(x.t) : A.planShips(x.s, x.n);
  run(A, clock, () => p.planet.ships?.colony >= 1 && p.planet.ships?.cargo >= 2, 30_000, 400);
  assert.ok(p.planet.ships.colony >= 1 && p.planet.ships.cargo >= 2, 'colon et cargos construits');
  const w = A.planets
    .filter((x) => !game.sameCell(x, p.home))
    .sort((a, b) => game.distance(a, p.home) - game.distance(b, p.home) || (a.id < b.id ? -1 : 1))[0];
  const colon = A.takeOff('home', { colony: 1 }, {}, 30);
  assert.ok(A.moveFleet(colon, { x: w.x, y: w.y }, 'colonize'));
  run(A, clock, () => p.colonies?.[w.id], 1000, 300);
  assert.ok(p.colonies[w.id], 'colonie fondée');
  // La colonie (riche) remplit vite son entrepôt : la navette va de la colonie vers la planète
  // mère, qui agrandit le sien. Partie d'ailleurs, la flotte rejoint d'abord la colonie.
  A.planBuild('store');
  A.planBuild('store');
  run(A, clock, () => false, 30_000, 20);
  const id = A.takeOff('home', { cargo: 2 }, {}, 30);
  assert.ok(A.shuttleFleet(id, { x: w.x, y: w.y }, p.home, ['minerals']));
  run(A, clock, () => A.myFleet(id).order.trips >= 2);
  const t0 = A.myFleet(id).order.trips;
  clock.t += 30 * MIN; // une absence
  A.tick(); // un seul passage au retour : tous les voyages de l'absence
  const trips = A.myFleet(id).order.trips;
  assert.ok(trips >= t0 + 2, `voyages pendant l'absence : ${t0} → ${trips}`);
  run(A, clock, () => false, 1000, 30);
  assert.ok(A.stopFleet(id));
  run(A, clock, () => false, 1000, 30);
  const state = clone(A.snapshot());
  const kinds = new Set(P(A).orders.map((o) => o.k));
  assert.ok(kinds.has('shuttleFleet'), 'la navette est au journal d’ordres');
  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  film.look(A, 'la copie de A rejouée : même fiche', [
    { show: 'livraisons avant l’arrêt', expected: 'au moins 4', got: trips, ok: trips >= 4 },
    { show: 'fiche rejouée à l’identique', expected: true, got: r.faithful[A.me] },
  ]);
  assert.ok(trips >= 4, `livraisons : ${trips}`);
  assert.equal(comparable(r.players[A.me]), comparable(state.players[A.me]));
  assert.equal(r.faithful[A.me], true);
  assert.ok(r.log.some((l) => l.text.includes('fait la navette')));
});
