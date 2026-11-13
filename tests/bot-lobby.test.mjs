// IA du lobby (D-399, D-400) : avant le départ, l'hôte qui fait jouer une IA peut la retirer,
// changer sa race et son nom. Chaque changement est une fiche de l'IA, écrite par sa propre
// Session : elle voyage jusqu'aux autres téléphones comme ses autres changements, et se rejoue.
import assert from 'node:assert/strict';
import { newLobby, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { think, addBot, removeBot, renameBot, setBotRace, editableBot } = await import('../js/bot.js');
const { replay, replayable } = await import('../js/replay.js');
const { describeSave } = await import('../js/save.js');

const scenario = scenarios(import.meta.url);
const flush = () => new Promise((r) => setTimeout(r, 0));
const names = (s) => s.roster.map((p) => p.name).sort();

/** Fait tourner tout le monde pendant `ms`, par pas de 1 s ; l'invité reçoit la copie de l'hôte. */
async function run(h, g, clock, ms, sync) {
  for (let t = 0; t < ms; t += 1000) {
    clock.t += 1000;
    for (const s of [h, g, ...h.bots.values()]) {
      s.tick();
      s.checkStart();
    }
    for (const b of h.bots.values()) if (t % 3000 === 0) think(b);
    await flush();
    sync(g, h);
    sync(h, g);
  }
}

scenario('D-399 / D-400 : dans le lobby, l’hôte renomme une IA, change sa race, en retire une autre ; l’invité voit tout, sa vieille copie ne fait rien revenir', async (film) => {
  const { players: [h, g], clock, sync } = newLobby(2);
  const a = addBot(h, { timers: false, clock: () => clock.t });
  const b = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  sync(g, h);
  const before = h.state.players[a.me].race;
  const other = ['human', 'machine', 'alien'].find((r) => r !== before);
  film.look(g, 'l’hôte a ajouté deux IA : l’invité les voit dans le lobby', [
    { show: 'joueurs chez l’invité', expected: 4, got: g.roster.length },
    { show: 'IA modifiable par l’hôte', expected: true, got: !!editableBot(h, a.me) },
    { show: 'IA modifiable par l’invité (il ne la fait pas jouer)', expected: false, got: !!editableBot(g, a.me) },
  ]);
  assert.equal(g.roster.length, 4);
  assert.equal(editableBot(g, a.me), null, 'seul l’hôte de l’IA peut la modifier');

  clock.t += 1000;
  const empty = renameBot(h, a.me, '   ');
  const renamed = renameBot(h, a.me, '  Zorg  ');
  const raced = setBotRace(h, a.me, other);
  const removed = removeBot(h, b.me);
  await flush();
  sync(g, h);
  film.look(g, 'nom vide refusé ; « Zorg » change de race ; la deuxième IA est retirée', [
    { show: 'nom vide accepté', expected: false, got: empty },
    { show: 'nom de l’IA chez l’invité', expected: 'Zorg', got: g.state.players[a.me].name },
    { show: 'race de l’IA chez l’invité', expected: other, got: g.state.players[a.me].race },
    { show: 'IA retirée encore listée chez l’invité', expected: false, got: g.roster.some((p) => p.id === b.me) },
    { show: 'IA retirée encore listée chez l’hôte', expected: false, got: h.roster.some((p) => p.id === b.me) },
    { show: 'IA retirée encore jouée par l’hôte', expected: false, got: h.bots.has(b.me) || h.botIds.includes(b.me) },
  ]);
  assert.equal(empty, false);
  assert.ok(renamed && raced && removed);
  assert.equal(g.state.players[a.me].name, 'Zorg', 'nom sans espaces autour');
  assert.equal(g.state.players[a.me].race, other);
  assert.deepEqual(names(g), names(h));
  assert.ok(!g.roster.some((p) => p.id === b.me) && !h.bots.has(b.me) && !h.botIds.includes(b.me));
  assert.ok(!describeSave({ state: g.snapshot() }).names.includes(b.name), 'pas dans le résumé de la sauvegarde');

  // L'invité renvoie sa copie (avec la fiche marquée « partie ») : l'IA ne revient pas.
  sync(h, g);
  assert.ok(!h.roster.some((p) => p.id === b.me), 'la copie de l’invité ne ramène pas l’IA');
  assert.equal(addBot(h, { timers: false, clock: () => clock.t }) && h.roster.length, 4, 'sa place est libre : une nouvelle IA peut venir');
  await flush();
  removeBot(h, [...h.bots.keys()].find((pid) => pid !== a.me));
  await flush();
  sync(g, h);
  assert.equal(g.roster.length, 3);
});

scenario('D-400 : la race changée dans le lobby est celle de l’IA en partie ; après le départ, plus rien ne se modifie, et la partie se rejoue', async (film) => {
  const { players: [h, g], clock, sync } = newLobby(2);
  const a = addBot(h, { timers: false, clock: () => clock.t });
  const b = addBot(h, { timers: false, clock: () => clock.t });
  await flush();
  const other = ['human', 'machine', 'alien'].find((r) => r !== h.state.players[a.me].race);
  clock.t += 1000;
  renameBot(h, a.me, 'Zorg');
  setBotRace(h, a.me, other);
  removeBot(h, b.me);
  await flush();
  sync(g, h);
  assert.ok(h.ready() && g.ready());
  sync(g, h);
  sync(h, g);
  await run(h, g, clock, 3 * 60_000, sync);
  const z = h.state.players[a.me];
  film.look(g, 'la partie est partie : Zorg joue avec sa nouvelle race, chez l’invité aussi', [
    { show: 'départ', expected: true, got: h.startedAt != null },
    { show: 'race de Zorg chez l’invité', expected: other, got: g.state.players[a.me].race },
    { show: 'nom de Zorg chez l’invité', expected: 'Zorg', got: g.state.players[a.me].name },
    { show: 'Zorg a fondé sa planète', expected: true, got: !!z.planet },
    { show: 'bâtiments de sa planète = ceux de sa race', expected: true, got: !!z.planet && Object.keys(z.planet.levels).every((k) => Object.hasOwn(game.RACES[other].buildings, k)) },
    { show: 'IA modifiable après le départ', expected: false, got: !!editableBot(h, a.me) },
    { show: 'renommer après le départ', expected: false, got: renameBot(h, a.me, 'Autre') },
    { show: 'retirer après le départ', expected: false, got: removeBot(h, a.me) },
  ]);
  assert.ok(h.startedAt != null && z.planet);
  assert.equal(g.state.players[a.me].race, other);
  assert.ok(Object.keys(z.planet.levels).every((k) => Object.hasOwn(game.RACES[other].buildings, k)), 'planète de la nouvelle race');
  assert.equal(editableBot(h, a.me), null);
  assert.equal(renameBot(h, a.me, 'Autre'), false);
  assert.equal(setBotRace(h, a.me, h.state.players[a.me].race === 'human' ? 'alien' : 'human'), false);
  assert.equal(removeBot(h, a.me), false);
  assert.equal(h.state.players[a.me].name, 'Zorg');
  // Le départ n'a attendu ni compté l'IA retirée.
  assert.ok(!h.ranking().some((r) => r.id === b.me));

  const state = h.snapshot();
  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  film.look(h, 'la copie de l’hôte rejouée : chaque fiche retombe à l’identique, IA renommée et IA retirée comprises', Object.values(state.players).map((p) => ({ show: `fiche de ${p.name} rejouée`, expected: true, got: r.faithful[p.id] })));
  for (const p of Object.values(state.players)) assert.equal(r.faithful[p.id], true, `fiche de ${p.name}`);
});

/** Fait réfléchir les IA des deux téléphones, puis échange les copies, `n` fois. */
async function settle(h, g, sync, n = 3) {
  for (let k = 0; k < n; k++) {
    await flush();
    for (const s of [h, g]) for (const b of s.bots.values()) think(b);
    await flush();
    sync(g, h);
    sync(h, g);
  }
}

scenario('#81 / D-480 : deux téléphones séparés remplissent chacun leur lobby d’IA ; réunis, aucun nom en double et pas de départ à plus de 8', async (film) => {
  const { players: [h, g], clock, sync, online } = newLobby(2);
  const opts = { timers: false, clock: () => clock.t };
  online.clear(); // le lien entre les deux tombe dans le lobby
  for (let i = 0; i < 6; i++) {
    clock.t += 10;
    addBot(h, opts);
    clock.t += 10;
    addBot(g, opts);
  }
  await flush();
  assert.equal(addBot(h, opts), null, 'à 8 dans sa copie, « Ajouter une IA » est refusé');
  assert.equal(h.roster.length, 8);
  assert.equal(g.roster.length, 8);

  online.add('p0').add('p1'); // le lien revient
  sync(g, h);
  sync(h, g);
  await settle(h, g, sync);
  const dup = (s) => s.roster.length - new Set(s.roster.map((p) => p.name)).size;
  film.look(g, 'réunis : 14 joueurs, chaque IA a un nom à elle, la partie ne part pas', [
    { show: 'joueurs chez A / chez B', expected: '14 / 14', got: `${h.roster.length} / ${g.roster.length}` },
    { show: 'noms en double chez A', expected: 0, got: dup(h) },
    { show: 'noms en double chez B', expected: 0, got: dup(g) },
    { show: 'mêmes noms chez A et B', expected: true, got: names(h).join() === names(g).join() },
    { show: 'trop de joueurs (chez A et chez B)', expected: true, got: h.tooMany && g.tooMany },
    { show: 'nouvelle IA acceptée', expected: false, got: !!addBot(g, opts) },
  ]);
  assert.equal(h.roster.length, 14);
  assert.equal(dup(h), 0, `noms chez A : ${names(h).join(', ')}`);
  assert.equal(dup(g), 0, `noms chez B : ${names(g).join(', ')}`);
  assert.deepEqual(names(h), names(g));
  assert.ok(h.tooMany && g.tooMany);

  // Tout le monde est prêt : le départ ne part pas tant qu'il y a plus de 8 joueurs.
  assert.ok(h.ready() && g.ready());
  await settle(h, g, sync);
  for (const s of [h, g, ...h.bots.values(), ...g.bots.values()]) s.checkStart();
  await settle(h, g, sync);
  assert.equal(h.startedAt, null, 'pas de départ à 14');
  assert.equal(g.startedAt, null);

  // Chacun retire trois de ses IA (seul le téléphone qui la fait jouer le peut) : 8 joueurs, départ.
  clock.t += 1000;
  for (const s of [h, g]) for (const pid of [...s.bots.keys()].slice(0, 3)) assert.ok(removeBot(s, pid));
  await settle(h, g, sync);
  for (const s of [h, g, ...h.bots.values(), ...g.bots.values()]) s.checkStart();
  await settle(h, g, sync);
  film.look(g, 'trois IA retirées de chaque côté : 8 joueurs, la partie part', [
    { show: 'joueurs', expected: 8, got: g.roster.length },
    { show: 'départ', expected: true, got: g.startedAt != null },
  ]);
  assert.equal(g.roster.length, 8);
  assert.ok(h.startedAt != null && g.startedAt != null);
});

scenario('#81 / D-480 : deux « Ajouter une IA » sur deux téléphones reliés, dans la même fraction de seconde : deux noms différents', async () => {
  const { players: [h, g], clock, sync } = newLobby(2);
  const opts = { timers: false, clock: () => clock.t };
  const a = addBot(h, opts);
  const b = addBot(g, opts); // g ne sait pas encore que h vient d'ajouter « IA Véga »
  assert.equal(a.name, b.name, 'chacun a choisi le même premier nom libre');
  await flush();
  sync(g, h);
  sync(h, g);
  await settle(h, g, sync);
  assert.notEqual(h.state.players[a.me].name, h.state.players[b.me].name);
  assert.deepEqual(names(h), names(g));
});
