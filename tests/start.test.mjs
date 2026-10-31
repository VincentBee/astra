// Départ de la partie (D-120) : elle part quand tous les joueurs présents sont
// prêts ; chacun n'a alors qu'une flotte avec un colonisateur, qui va fonder
// sa planète mère sur une planète libre.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newLobby, game, fleet } from './harness.mjs';

const { replay, replayable } = await import('../js/replay.js');
const { SHIPS } = await import('../js/tech.js');

afterEach(() => {
  game.FROST.delayMs = Infinity;
});

const me = (s) => s.state.players[s.me];
const all = (players, sync) => {
  for (const a of players) for (const b of players) if (a !== b) sync(a, b);
};
/** Une planète libre (pas un petit corps) qui n'est pas la case de départ. */
const freePlanet = (s, skip = []) => s.planets.find((w) => w.kind === 'planet' && !skip.includes(w.id) && !s.ownerAt(w));
/** Envoie le colonisateur de `s` fonder sa planète mère sur `w`, et attend l'arrivée. */
function settleOn(s, w, clock) {
  const f = me(s).fleets[0];
  assert.ok(s.moveFleet(f.id, { x: w.x, y: w.y }, 'colonize'), 'ordre accepté');
  clock.t = Math.max(clock.t, me(s).fleets[0].arrive) + 1;
  s.tick();
}

test('D-120 : la partie ne part pas tant qu’un joueur présent n’est pas prêt', () => {
  const { players: [A, B], sync } = newLobby(2);
  assert.ok(A.ready());
  sync(B, A);
  sync(A, B);
  assert.equal(A.checkStart(), false, 'B n’est pas prêt');
  assert.equal(B.checkStart(), false, 'B n’est pas prêt lui-même');
  A.tick();
  assert.equal(A.startedAt, null);
  assert.equal((me(A).fleets || []).length, 0, 'pas de flotte avant le départ');
  assert.deepEqual(A.notReady.map((p) => p.id), ['p1']);
});

test('D-120 : tous prêts → départ, puis une seule flotte avec un colonisateur chacun', () => {
  const { players, clock, sync } = newLobby(3);
  for (const s of players) {
    assert.ok(s.ready());
    all(players, sync);
  }
  clock.t += 1000;
  assert.ok(players[2].checkStart(), 'le dernier prêt donne le départ');
  const go = clock.t;
  all(players, sync);
  for (const s of players) assert.equal(s.startedAt, go, 'même départ partout');
  clock.t += 500;
  const cells = [];
  for (const s of players) {
    s.tick();
    const p = me(s);
    assert.equal(p.planet, null, 'pas de planète au départ');
    assert.equal(p.home, null);
    assert.equal(p.fleets.length, 1, 'une seule flotte');
    const f = p.fleets[0];
    assert.deepEqual(f.ships, { colony: 1 }, 'un seul colonisateur');
    assert.equal(f.fuel, fleet.fleetTank(p.race, f.ships), 'le plein est fait');
    assert.equal(f.depart, go, 'la flotte est là depuis le départ');
    assert.equal(p.since, go);
    assert.ok(!s.planets.some((w) => game.sameCell(w, f.to)), 'pas sur une planète');
    cells.push(`${f.to.x}:${f.to.y}`);
  }
  assert.equal(new Set(cells).size, 3, 'chacun sa case de départ');
  // Un deuxième passage ne redonne pas de flotte.
  players[0].tick();
  assert.equal(me(players[0]).fleets.length, 1);
});

test('D-120 : le colonisateur fonde la planète mère ; s’installer directement est refusé', () => {
  const { players: [A], clock } = newLobby(1, ['human']);
  A.ready();
  assert.ok(A.checkStart(), 'seul présent : départ tout de suite');
  A.tick();
  const w = freePlanet(A);
  assert.equal(A.claimPlanet(w.id), false, 'plus d’installation directe');
  const small = A.planets.find((x) => x.kind === 'asteroid');
  assert.equal(A.moveFleet(me(A).fleets[0].id, { x: small.x, y: small.y }, 'colonize'), false, 'un astéroïde ne fait pas une planète mère');
  const labels = A.ordersAt(me(A).fleets[0].id, { x: w.x, y: w.y }).map((o) => o.label);
  assert.ok(labels.includes(`Fonder ta planète mère sur ${w.name}`));
  settleOn(A, w, clock);
  const p = me(A);
  assert.ok(game.sameCell(p.home, w), 'planète mère fondée');
  assert.equal(p.fleets.length, 0, 'le colonisateur est consommé');
  const fresh = game.newPlanet('human', p.claimAt, w);
  assert.deepEqual(p.planet.levels, fresh.levels, 'bâtiments de départ de la race');
  assert.ok(p.planet.stock.minerals >= fresh.stock.minerals, 'stock de départ de la race');
  assert.equal(p.planet.ships.colony, undefined);
  assert.ok(A.scoreOf(p) > 0);
});

test('D-120 : un joueur absent ne bloque pas le départ ; il entre dans la course quand il est prêt', () => {
  const { players: [A, B], clock, sync, online } = newLobby(2);
  online.delete('p1');
  online.delete('p0');
  A.refreshOnline();
  B.refreshOnline();
  A.ready();
  assert.ok(A.checkStart(), 'B est hors ligne : A part seul');
  A.tick();
  clock.t += 60_000;
  // B revient, voit la partie partie, se dit prêt : sa flotte arrive à cette heure-là.
  online.add('p0');
  online.add('p1');
  sync(B, A);
  assert.equal(B.ready(), true);
  const t = clock.t;
  B.tick();
  const f = me(B).fleets[0];
  assert.deepEqual(f.ships, { colony: 1 });
  assert.equal(f.depart, t, 'arrivé en retard, sa flotte apparaît quand il est prêt');
  assert.equal(B.ready(false), false, 'plus de retour en arrière après le départ');
});

test('D-120 : on peut se dire « plus prêt » avant le départ', () => {
  const { players: [A, B], sync } = newLobby(2);
  A.ready();
  assert.ok(A.ready(false));
  B.ready();
  sync(A, B);
  assert.equal(A.checkStart(), false, 'A n’est plus prêt');
  A.ready();
  sync(B, A);
  assert.ok(B.checkStart());
});

test('D-120 : deux colonisateurs sur la même planète : le premier arrivé l’emporte, l’autre repart en orbite', () => {
  const { players: [A, B], clock, sync } = newLobby(2, ['human', 'human']);
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  A.tick();
  B.tick();
  const w = freePlanet(A);
  const fa = me(A).fleets[0];
  const fb = me(B).fleets[0];
  A.moveFleet(fa.id, { x: w.x, y: w.y }, 'colonize');
  B.moveFleet(fb.id, { x: w.x, y: w.y }, 'colonize');
  const first = me(A).fleets[0].arrive <= me(B).fleets[0].arrive ? A : B;
  const second = first === A ? B : A;
  clock.t = Math.max(me(A).fleets[0].arrive, me(B).fleets[0].arrive) + 1;
  // Chacun applique son arrivée sans avoir vu l'autre (partie coupée).
  A.tick();
  B.tick();
  all([A, B], sync);
  first.tick();
  second.tick();
  assert.ok(game.sameCell(me(first).home, w), 'le premier garde la planète');
  assert.equal(me(second).home, null, 'le second la lui laisse');
  const back = me(second).fleets[0];
  assert.ok(back?.ships.colony >= 1, 'son colonisateur repart en orbite');
  assert.equal(me(second).out, undefined, 'il n’est pas éliminé');
});

test('D-120 : plus de colonisateur avant d’avoir fondé sa planète : éliminé, l’autre gagne', () => {
  const { players: [A, B], clock, sync } = newLobby(2, ['human', 'machine']);
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  A.tick();
  B.tick();
  settleOn(A, freePlanet(A), clock);
  // Le colonisateur de B est détruit (combat) : B n'a plus rien pour fonder sa planète.
  me(B).fleets = [];
  clock.t += 1000;
  B.tick();
  assert.ok(Number.isFinite(me(B).out), 'B est éliminé');
  all([A, B], sync);
  A.tick();
  assert.equal(A.over?.winner, 'p0', 'A, seul en vie, gagne');
});

test('D-120 : tant qu’un joueur vole vers sa planète, la partie ne finit pas', () => {
  const { players: [A, B], clock, sync } = newLobby(2);
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  A.tick();
  B.tick();
  settleOn(A, freePlanet(A), clock);
  all([A, B], sync);
  A.tick();
  assert.equal(A.over, null);
  assert.equal(A.ranking().length, 2, 'B, encore en vol, est dans le classement');
});

test('D-120 : la planète mère fondée hors ligne est acceptée par les autres', () => {
  const { players: [A, B], clock, sync } = newLobby(2);
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  A.tick();
  const w = freePlanet(A);
  A.moveFleet(me(A).fleets[0].id, { x: w.x, y: w.y }, 'colonize');
  sync(B, A); // B voit la flotte en route
  // A passe en arrière-plan longtemps après l'arrivée, puis fait autre chose avant de se réveiller.
  clock.t = me(A).fleets[0].arrive + 10 * 60_000;
  A.tick();
  assert.ok(me(A).home);
  sync(B, A);
  assert.ok(game.sameCell(B.state.players.p0.home, w), 'B accepte la fiche de A');
});

test('D-120 : une partie jouée depuis le départ commun se rejoue à l’identique', () => {
  const { players, clock, sync } = newLobby(2);
  for (const s of players) {
    s.ready();
    all(players, sync);
  }
  players[1].checkStart();
  all(players, sync);
  for (const s of players) {
    s.tick();
    all(players, sync);
  }
  const used = [];
  for (const s of players) {
    const w = freePlanet(s, used);
    used.push(w.id);
    s.moveFleet(me(s).fleets[0].id, { x: w.x, y: w.y }, 'colonize');
    all(players, sync);
  }
  clock.t += 5 * 60_000;
  for (const s of players) {
    s.tick();
    all(players, sync);
  }
  for (const s of players) assert.ok(me(s).home, `${s.name} a sa planète`);
  const state = players[0].state;
  const kinds = new Set(Object.values(state.players).flatMap((p) => p.orders.map((o) => o.k)));
  for (const k of ['chooseRace', 'ready', 'begin', 'moveFleet', 'tick']) assert.ok(kinds.has(k), `la partie contient des « ${k} »`);
  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  for (const p of Object.values(state.players)) assert.equal(r.faithful[p.id], true, `fiche de ${p.name} rejouée à l’identique`);
});

test('D-120 : la flotte de départ a de quoi atteindre n’importe quelle planète de la carte', () => {
  for (const gid of ['gtest', 'autre', 'encore']) {
    const { players, sync } = newLobby(3, ['human', 'machine', 'alien']);
    for (const s of players) {
      s.state.gid = gid;
      delete s.world;
    }
    for (const s of players) {
      s.ready();
      all(players, sync);
    }
    players[0].checkStart();
    all(players, sync);
    for (const s of players) {
      s.tick();
      const p = me(s);
      const f = p.fleets[0];
      for (const w of s.planets) assert.ok(fleet.fuelNeed(f, p.race, w, f.depart) <= f.fuel, `${p.race} (${gid}) atteint ${w.name}`);
    }
  }
});
