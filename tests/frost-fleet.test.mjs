// Le froid détruit les flottes qu'il atteint (D-163), à quai comme en vol, celles de tous les
// joueurs. Un joueur qui n'a jamais fondé sa planète mère perd alors son colonisateur et il est
// éliminé : il ne peut plus gagner en attendant que le froid prenne les autres (issue #33).
import { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, newLobby, game, fleet } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { replay } = await import('../js/replay.js');
const scenario = scenarios(import.meta.url);

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

/** Froid actif : il part tout de suite et atteint le soleil en 10 min. */
const frost = () => Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
const me = (s) => s.state.players[s.me];
const all = (players, sync) => {
  for (const a of players) for (const b of players) if (a !== b) sync(a, b);
};
const min = (s, t) => +((t - s.startedAt) / 60_000).toFixed(3);
/** La case la plus loin du soleil parmi les coins de la carte. */
const corner = (s) => {
  const sun = game.sunFor(s.state.gid);
  const cs = [{ x: 0, y: 0 }, { x: game.UNIVERSE.w - 1, y: 0 }, { x: 0, y: game.UNIVERSE.h - 1 }, { x: game.UNIVERSE.w - 1, y: game.UNIVERSE.h - 1 }];
  return cs.sort((a, b) => game.sunDistance(sun, b).d - game.sunDistance(sun, a).d)[0];
};
/** La case à `n` cases de `c`, dans l'axe soleil → `c` (plus loin du soleil). */
function outward(s, c, n) {
  const sun = game.sunFor(s.state.gid);
  const mid = { x: sun.x + sun.size / 2, y: sun.y + sun.size / 2 };
  const dx = c.x + 0.5 - mid.x;
  const dy = c.y + 0.5 - mid.y;
  const k = n / Math.hypot(dx, dy);
  const clamp = (v, hi) => Math.min(hi - 1, Math.max(0, Math.round(v)));
  return { x: clamp(c.x + dx * k, game.UNIVERSE.w), y: clamp(c.y + dy * k, game.UNIVERSE.h) };
}
/** Départ commun à deux (D-120), chacun avec son colonisateur sur sa case de départ. */
function race2() {
  const lobby = newLobby(2, ['human', 'machine']);
  const { players: [A, B], sync } = lobby;
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  A.tick();
  B.tick();
  all([A, B], sync);
  return lobby;
}

scenario('D-163 : une flotte à quai est détruite par le froid à l’heure où il atteint sa case', (film) => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  // B a une colonie tout près du soleil : il survit au gel de sa planète mère, la partie continue.
  const warm = A.planets.filter((w) => !A.ownerAt(w)).sort((a, b) => A.frostOf(b) - A.frostOf(a))[0];
  me(B).colonies = { [warm.id]: { ...game.newPlanet('machine', clock.t, warm), claimAt: clock.t } };
  B.touch();
  all([A, B], sync);
  const p = me(A);
  p.planet.ships = { ...(p.planet.ships || {}), fighter: 3 };
  const id = A.takeOff('home', { fighter: 3 }, {}, 3);
  assert.ok(id, 'la flotte décolle');
  // Elle va se garer 4 cases plus loin du soleil que la planète mère, et y reste.
  const out = outward(A, p.home, 4);
  assert.ok(A.moveFleet(id, out), 'ordre accepté');
  clock.t = me(A).fleets[0].arrive + 1;
  A.tick();
  const f = me(A).fleets.find((x) => x.id === id);
  assert.ok(f && !fleet.moving(f, clock.t), 'garée');
  sync(B, A);
  const cell = { ...f.to };
  const t = A.fleetFrostAt(f);
  const seenByB = B.fleetFrostAt(B.state.players[A.me].fleets.find((x) => x.id === id));
  film.look(A, 'A : 3 frégates garées loin du soleil', [
    { show: 'gel de la flotte (min), chez A', at: [A, id], expected: min(A, A.frostOf(cell)), got: min(A, t) },
    { show: 'gel de la flotte (min), chez B', expected: min(A, t), got: min(A, seenByB) },
  ]);
  assert.equal(t, A.frostOf(cell), 'à quai : l’heure du gel de sa case');
  assert.equal(seenByB, t, 'les deux téléphones calculent la même heure');
  clock.t = t - 1;
  B.tick(); // B voit peut-être sa planète mère geler : sa colonie la remplace, il reste en vie
  all([A, B], sync);
  A.tick();
  film.look(A, 'juste avant le gel : la flotte est là', [{ show: 'flottes de A', at: [A, id], expected: 1, got: me(A).fleets.length }]);
  assert.equal(me(A).fleets.length, 1);
  sync(B, A);
  clock.t = t;
  film.look(B, 'à l’heure du gel, B ne la voit plus, même avant que A ne l’ait notée', [{ show: 'B voit la flotte de A', expected: false, got: B.sees(B.state.players[A.me], B.state.players[A.me].fleets[0], clock.t) }]);
  assert.equal(B.sees(B.state.players[A.me], B.state.players[A.me].fleets[0], clock.t), false);
  A.tick();
  const line = A.state.log.at(-1)?.text || '';
  film.look(A, 'à l’heure du gel : la flotte est détruite, A garde sa planète', [
    { show: 'flottes de A', expected: 0, got: me(A).fleets.length },
    { show: 'journal', expected: 'Le froid détruit une flotte…', got: line, ok: /^Le froid détruit une flotte de J0/.test(line) },
    { show: 'A éliminé', expected: false, got: Number.isFinite(me(A).out) },
  ]);
  assert.equal(me(A).fleets.length, 0, 'flotte détruite');
  assert.match(line, /^Le froid détruit une flotte de J0 en \[\d+:\d+\] \(3 vaisseaux\)\.$/);
  assert.ok(!Number.isFinite(me(A).out), 'A a encore sa planète');
});

scenario('D-163 : une flotte en vol est détruite là où le froid la rattrape, à la même heure sur les deux téléphones', (film) => {
  frost();
  const { players: [A, B], clock, sync } = race2();
  const f = me(B).fleets[0];
  const out = outward(B, f.to, 12); // droit vers le bord, dans l'axe soleil → case de départ
  // Une minute avant que le froid n'atteigne sa case de départ, B file vers le bord : le froid vient à sa rencontre.
  clock.t = B.frostOf(f.to) - 60_000;
  const stay = B.frostOf(f.to);
  assert.ok(B.moveFleet(f.id, out), 'B part vers le bord de la carte');
  sync(A, B);
  const tB = B.fleetFrostAt(me(B).fleets[0]);
  const tA = A.fleetFrostAt(A.state.players[B.me].fleets[0]);
  const fl = me(B).fleets[0];
  film.look(B, 'B envoie son colonisateur vers le bord, loin du soleil', [
    { show: 'gel en vol (min), chez B', at: [B, f.id], expected: `avant l’arrivée (${min(B, fl.arrive)})`, got: min(B, tB), ok: tB < fl.arrive },
    { show: 'gel en vol (min), chez A', expected: min(B, tB), got: min(B, tA) },
    { show: 'gel s’il était resté sur sa case (min)', expected: `après ${min(B, tB)}`, got: min(B, stay), ok: stay > tB },
  ]);
  assert.ok(tB > fl.depart && tB < fl.arrive, 'le froid le rattrape en vol');
  assert.ok(tB < stay, 'plus tôt que s’il était resté sur sa case de départ');
  assert.equal(tA, tB, 'les deux téléphones calculent la même heure');
  clock.t = tB - 1;
  B.tick();
  assert.equal(me(B).fleets.length, 1, 'encore en vol juste avant');
  clock.t = tB + 30_000;
  B.tick();
  film.look(B, '30 s après : le colonisateur a été détruit, à l’heure du gel', [
    { show: 'flottes de B', expected: 0, got: me(B).fleets.length },
    { show: 'B éliminé (min)', expected: min(B, tB), got: Number.isFinite(me(B).out) ? min(B, me(B).out) : 'non' },
  ]);
  assert.equal(me(B).fleets.length, 0);
  assert.equal(me(B).out, tB, 'éliminé à l’heure du gel, pas à l’heure du passage');
});

scenario('D-163 (issue #33) : A fonde, B garde son colonisateur en vol ; le froid le détruit, B est éliminé et ne gagne pas', (film) => {
  frost();
  const { players: [A, B], clock, sync } = race2();
  // A fonde sur la planète libre la plus près du soleil (la dernière à geler).
  const w = A.planets.filter((x) => x.kind === 'planet' && !A.ownerAt(x)).sort((a, b) => A.frostOf(b) - A.frostOf(a))[0];
  assert.ok(A.moveFleet(me(A).fleets[0].id, { x: w.x, y: w.y }, 'colonize'));
  clock.t = me(A).fleets[0].arrive + 1;
  A.tick();
  assert.ok(me(A).home, 'A a fondé');
  // B part vers le bord de la carte et n'y fonde rien.
  assert.ok(B.moveFleet(me(B).fleets[0].id, corner(B)));
  all([A, B], sync);
  const tB = A.fleetFrostAt(A.state.players[B.me].fleets[0]);
  film.look(A, 'A a fondé sa planète, B garde son colonisateur en vol vers le bord', [
    { show: 'gel du colonisateur de B (min)', expected: `avant celui de A (${min(A, A.frostOf(w))})`, got: min(A, tB), ok: tB < A.frostOf(w) },
  ]);
  assert.ok(tB < A.frostOf(w));
  // B ferme l'appli : seul A tourne. Sa copie voit B mort à l'heure du gel du colonisateur.
  clock.t = tB + 1000;
  A.tick();
  film.look(A, 'B hors ligne : A voit le colonisateur de B gelé, B éliminé, A gagne', [
    { show: 'B mort (min), vu par A', expected: min(A, tB), got: A.deadAt(A.state.players[B.me]) == null ? 'en vie' : min(A, A.deadAt(A.state.players[B.me])) },
    { show: 'gagnant', expected: 'p0', got: A.over?.winner ?? null },
  ]);
  assert.equal(A.deadAt(A.state.players[B.me]), tB, 'deadAt de B : l’heure du gel de son colonisateur');
  assert.equal(A.over?.winner, 'p0', 'A gagne');
  assert.equal(A.over?.at, tB, 'la partie finit à l’heure du gel du colonisateur');
  // B revient : son téléphone arrive au même résultat.
  B.tick();
  assert.equal(me(B).out, tB, 'B s’élimine lui-même à la même heure');
  sync(B, A);
  assert.equal(B.over?.winner, 'p0');
  const rank = A.ranking();
  assert.deepEqual(rank.map((r) => r.id), ['p0', 'p1'], 'A premier, B second');
  // La partie se rejoue à l'identique, gel de la flotte compris.
  sync(A, B);
  const r = replay(A.state);
  film.look(A, 'fin : A gagne ; la partie rejouée donne les mêmes fiches', [
    { show: 'gagnant', expected: 'p0', got: A.over?.winner ?? null },
    ...Object.values(A.state.players).map((q) => ({ show: `fiche de ${q.name} rejouée à l’identique`, expected: true, got: r.faithful[q.id] })),
  ]);
  for (const q of Object.values(A.state.players)) assert.equal(r.faithful[q.id], true, `fiche de ${q.name} rejouée à l’identique`);
});

scenario('D-163 : la flotte de départ d’un joueur prêt mais déconnecté existe pour tous, et le froid la détruit', (film) => {
  frost();
  const { players: [A, B, C], clock, sync } = newLobby(3, ['human', 'machine', 'alien']);
  for (const s of [A, B, C]) s.ready();
  all([A, B, C], sync);
  A.checkStart();
  all([A, B, C], sync);
  // C ferme l'appli avant d'avoir fait un passage : sa fiche n'a ni since ni flotte.
  A.tick();
  B.tick();
  all([A, B], sync);
  const c = A.state.players[C.me];
  assert.ok(!Number.isFinite(c.since) && !(c.fleets || []).length && A.inRace(c), 'C est dans la course, sans flotte dans sa fiche');
  const cell = A.startCell(c, A.startedAt);
  const ghostA = A.fleetsOf(c)[0];
  const ghostB = B.fleetsOf(B.state.players[C.me])[0];
  const t = A.frostOf(cell);
  film.look(A, 'C prêt mais téléphone éteint : les autres voient quand même sa flotte de départ', [
    { show: 'flotte de départ de C, chez A', at: cell, expected: `colonisateur en [${cell.x}:${cell.y}]`, got: ghostA ? `colonisateur en [${ghostA.to.x}:${ghostA.to.y}]` : 'aucune' },
    { show: 'même flotte chez B (identifiant)', expected: ghostA?.id, got: ghostB?.id },
    { show: 'C mort, vu par A (min)', expected: 'en vie', got: A.deadAt(c) == null ? 'en vie' : min(A, A.deadAt(c)) },
    { show: 'gel de sa case de départ (min)', at: cell, expected: min(A, t), got: min(A, t) },
  ]);
  assert.ok(ghostA && ghostA.ships.colony === 1 && game.sameCell(ghostA.to, cell), 'un colonisateur sur sa case de départ');
  assert.equal(ghostA.depart, Math.max(A.startedAt, c.ready), 'apparue au départ (ou quand il a été prêt)');
  assert.deepEqual(ghostB, ghostA, 'la même flotte sur les deux téléphones');
  assert.equal(A.deadAt(c), null, 'en vie avant le gel de sa case');
  clock.t = t;
  assert.equal(A.sees(c, ghostA, clock.t), false, 'gelée : plus visible');
  assert.equal(A.deadAt(c), t, 'mort au gel de sa flotte de départ');
  assert.equal(B.deadAt(B.state.players[C.me]), t, 'même heure chez B');
  // Revenu après, son téléphone fait apparaître la même flotte… déjà gelée : même heure.
  clock.t = t + 5000;
  C.tick();
  film.look(C, 'C revient après le gel : sa flotte de départ est détruite, il est éliminé à la même heure', [
    { show: 'C éliminé (min)', expected: min(C, t), got: Number.isFinite(me(C).out) ? min(C, me(C).out) : 'non' },
  ]);
  assert.equal(me(C).out, t);
  assert.equal(me(C).fleets.length, 0);
  assert.match(C.state.log.map((l) => l.text).join('\n'), new RegExp(`Le froid détruit une flotte de J2 en \\[${cell.x}:${cell.y}\\]`));
  // La partie se rejoue à l'identique : la flotte de départ de C, son identifiant, son gel.
  for (const s of [A, B]) sync(s, C);
  sync(C, A);
  sync(C, B);
  const r = replay(A.state);
  for (const q of Object.values(A.state.players)) assert.equal(r.faithful[q.id], true, `fiche de ${q.name} rejouée à l’identique`);
});

scenario('D-163 : A détruit au combat la flotte de départ de B, déconnecté depuis le départ : B est éliminé, A gagne', (film) => {
  const { players: [A, B], clock, sync, online } = newLobby(2, ['human', 'machine']);
  A.ready();
  B.ready();
  all([A, B], sync);
  A.checkStart();
  all([A, B], sync);
  // B ferme l'appli tout de suite : son téléphone ne fera aucun passage.
  online.delete(B.me);
  A.refreshOnline();
  A.tick();
  const b = A.state.players[B.me];
  const ghost = A.fleetsOf(b)[0];
  assert.ok(ghost && !(b.fleets || []).length, 'A voit la flotte de départ de B, que la fiche de B n’a pas');
  // A fonde sa planète mère sur la planète libre la plus proche, puis arme 3 frégates.
  const pos = me(A).fleets[0].to;
  const w = A.planets.filter((x) => x.kind === 'planet' && !A.ownerAt(x)).sort((a, z) => Math.hypot(a.x - pos.x, a.y - pos.y) - Math.hypot(z.x - pos.x, z.y - pos.y))[0];
  assert.ok(A.moveFleet(me(A).fleets[0].id, { x: w.x, y: w.y }, 'colonize'));
  clock.t = me(A).fleets[0].arrive + 1;
  A.tick();
  assert.ok(me(A).home, 'A a fondé');
  me(A).planet.ships = { ...(me(A).planet.ships || {}), fighter: 3 };
  const id = A.takeOff('home', { fighter: 3 }, {}, 3);
  assert.ok(id, 'les frégates décollent');
  me(A).fleets.find((f) => f.id === id).fuel = fleet.fleetTank('human', { fighter: 3 }); // le plein, pour aller loin
  // Elles vont jusqu'à la case de départ de B, puis A prend sa flotte en chasse.
  assert.ok(A.moveFleet(id, { ...ghost.to }), 'cap sur la case de départ de B');
  clock.t = me(A).fleets.find((f) => f.id === id).arrive + 1;
  A.tick();
  film.look(A, 'les frégates de A arrivent sur la case de départ de B, où attend son colonisateur', [
    { show: 'A voit la flotte de B', at: ghost.to, expected: true, got: A.sees(b, ghost, clock.t) },
    { show: 'fiche de B : flottes', expected: 0, got: (b.fleets || []).length },
  ]);
  assert.equal(A.sees(b, ghost, clock.t), true);
  const fightAt = clock.t;
  assert.ok(A.chaseFleet(id, B.me, ghost.id), 'A attaque');
  const e = me(A).effects.find((x) => x.to === B.me);
  assert.ok(e && e.fleet === ghost.id && e.ships.colony === 1, 'rapport : le colonisateur de B détruit');
  A.tick();
  film.look(A, 'combat gagné : B, toujours hors ligne, est éliminé et A gagne', [
    { show: 'B mort (heure du combat)', expected: fightAt, got: A.deadAt(b) },
    { show: 'A voit encore la flotte de B', expected: false, got: A.sees(b, ghost, clock.t) },
    { show: 'gagnant', expected: 'p0', got: A.over?.winner ?? null },
  ]);
  assert.equal(e.at, fightAt);
  assert.equal(A.deadAt(b), fightAt, 'B mort à l’heure du combat, sans que sa fiche ait changé');
  assert.equal(A.sees(b, ghost, clock.t), false, 'sa flotte a disparu de la carte');
  assert.equal(A.over?.winner, 'p0', 'A gagne');
  assert.equal(A.over?.at, fightAt);
  // B revient bien plus tard : son téléphone retrouve la même flotte, et le combat qui l'a détruite.
  clock.t += 20 * 60_000;
  online.add(B.me);
  sync(B, A);
  B.tick();
  film.look(B, 'B revient : sa flotte de départ (même identifiant) a été détruite, il est éliminé à l’heure du combat', [
    { show: 'B éliminé à', expected: fightAt, got: me(B).out ?? 'non' },
    { show: 'flottes de B', expected: 0, got: me(B).fleets.length },
    { show: 'gagnant vu par B', expected: 'p0', got: B.over?.winner ?? null },
  ]);
  assert.equal(me(B).since, ghost.depart, 'entré à l’heure du départ');
  assert.equal(me(B).out, fightAt, 'éliminé à l’heure du combat, pas à son retour');
  assert.equal(me(B).fleets.length, 0, 'pas de nouvelle flotte');
  assert.match(B.state.log.map((l) => l.text).join('\n'), /Une flotte de J1 est détruite par J0\./);
  assert.equal(B.over?.winner, 'p0');
  sync(A, B);
  assert.deepEqual(A.ranking().map((r) => r.id), ['p0', 'p1']);
  // (Pas de rejeu ici : le test donne à A ses frégates et leur carburant à la main, hors de son
  // journal d'ordres. Le rejeu de la flotte de départ est vérifié dans le scénario du froid.)
});
