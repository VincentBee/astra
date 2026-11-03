// Fil de construction d'une planète (D-105) : chantier libre, le bâtiment
// suivant se lance tout seul dès que le stock couvre son prix, même pendant
// une absence ; les estimations disent quand.
//
// En scénario (D-129) : la planète testée devient celle du joueur A dans une vraie partie, et
// l'image ouvre sa fiche (fil et chantier compris), telle que le vrai jeu la dessine à cet instant.
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { replay, comparable } = await import('../js/replay.js');
const { normalize } = await import('../js/session.js');
const scenario = scenarios(import.meta.url);

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

/**
 * Une vraie partie à un joueur humain, A, sur la case de `poor()` (la première de la carte
 * « gtest ») ; l'horloge part de T0. show(p, intitulé, heure) : la planète de A devient `p`, et A
 * la touche à cette heure-là ; l'image ouvre sa fiche (avec « Voir la planète », D-139).
 */
function stage(film) {
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  const show = (p, label, t = clock.t) => {
    P.planet = p;
    clock.t = t;
    film.look(A, label, [{ sheet: P.home, button: true }]);
  };
  return { A, clock, show };
}

scenario('le premier du fil se lance quand le stock suffit, pas avant', (film) => {
  const { A, clock, show } = stage(film);
  const p = poor();
  p.plan = ['mine'];
  show(p, 'A met une mine au fil, sans minéraux pour la payer');
  // Le film : le vrai jeu recalcule la planète à chaque image, la mine se lance quand le stock suffit.
  film.roll(A, clock, T0 + 30 * MIN, 'les minéraux arrivent');
  show(p, '30 min plus tard : la mine est lancée, le fil est vide');
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

scenario('le fil garde son ordre et enchaîne sans attendre un passage du joueur', (film) => {
  const { A, clock, show } = stage(film);
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.plan = ['solar', 'mine', 'solar'];
  show(p, 'A met centrale, mine, centrale au fil ; le stock paie tout');
  film.roll(A, clock, T0 + 60 * MIN, 'A est absent, le fil enchaîne');
  show(p, '1 h plus tard : les trois chantiers faits, dans l’ordre');
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

scenario('settle écrit le fil restant, et ne recompte rien en heure qui recule', (film) => {
  const { show } = stage(film);
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.plan = ['solar', 'mine'];
  show(p, 'A met centrale puis mine au fil', T0);
  const done = game.settle(p, T0 + SEC);
  show(p, 'une seconde plus tard : la centrale est au chantier, la mine attend', T0 + SEC);
  assert.equal(done.filter((d) => d.kind === 'start').length, 1);
  assert.deepEqual(p.plan, ['mine']);
  assert.equal(p.queue.key, 'solar');
  const copy = clone(p);
  game.settle(p, T0); // l'horloge recule : rien ne change
  show(p, 'l’horloge du téléphone recule d’une seconde : rien ne change', T0);
  assert.deepEqual(p, copy);
});

scenario('plus de place : le fil attend, et l’estimation dit pourquoi', (film) => {
  const { show } = stage(film);
  const p = poor();
  p.stock.minerals = 5000;
  p.stock.energy = 5000;
  p.places = game.usedPlaces(p.levels);
  p.plan = ['mine'];
  show(p, 'planète pleine, une mine au fil : l’estimation dit « Plus de place »', T0);
  show(p, '10 min plus tard : la mine attend toujours', T0 + 10 * MIN);
  const s = game.stateAt(p, T0 + 10 * MIN);
  assert.equal(s.queue, null);
  assert.deepEqual(s.plan, ['mine']);
  const [f] = game.planForecast(p, T0);
  assert.equal(f.start, null);
  assert.equal(f.why, 'Plus de place');
});

scenario('estimation : dans l’ordre, après le chantier en cours, et identique au vrai calcul', (film) => {
  const { A, clock, show } = stage(film);
  const p = poor();
  p.plan = ['mine', 'solar'];
  const f = game.planForecast(p, T0);
  show(p, 'A met mine puis centrale au fil : la fiche annonce quand chacune se lance');
  film.roll(A, clock, f[0].start + 1, 'on attend l’heure annoncée pour la mine');
  show(p, 'l’heure annoncée : la mine est lancée');
  assert.equal(f.length, 2);
  assert.ok(f[0].start > T0);
  assert.ok(f[1].start >= f[0].end);
  assert.equal(f[0].level, 5);
  // Ce qui est annoncé à 10 min près est ce qui arrive vraiment.
  const real = game.stateAt(p, f[0].start + 1).done.find((d) => d.kind === 'start');
  assert.ok(Math.abs(real.start - f[0].start) <= 2 * SEC);
});

scenario('le joueur : fil par ordre, lancement au passage, retrait, et la partie se rejoue à l’identique', (film) => {
  const { players, clock, sync } = newGame(2);
  const [a, b] = players;
  const pa = () => a.state.players[a.me].planet;
  film.look(a, 'départ : A et B sur leur planète mère');
  // Le stock de départ paie la première mine (lancée tout de suite) ; les suivantes attendent.
  for (let i = 0; i < 4; i++) a.planBuild('mine');
  const home = a.state.players[a.me].home;
  film.look(a, 'A met 4 mines au fil : la 1ʳᵉ est lancée, 3 attendent', [
    { show: 'chantier', at: home, expected: 'mine', got: pa().queue?.key },
    { show: 'fil', at: home, expected: ['mine', 'mine', 'mine'], got: pa().plan },
  ]);
  assert.equal(pa().queue.key, 'mine');
  assert.deepEqual(pa().plan, ['mine', 'mine', 'mine']);
  a.unplan('farm', 2); // ce n'est pas ce qui est à cette place : refusé
  assert.equal(pa().plan.length, 3);
  a.unplan('mine', 2);
  assert.deepEqual(pa().plan, ['mine', 'mine']);
  a.unplan('mine', 5); // refusé, sans dégâts
  assert.equal(pa().plan.length, 2);
  film.look(a, 'A retire une mine du fil : il en reste 2 (les retraits mal visés sont refusés)', [{ show: 'fil', at: home, expected: ['mine', 'mine'], got: pa().plan }]);
  for (let i = 0; i < 40; i++) {
    clock.t += 30 * SEC;
    a.tick();
    b.tick();
    sync(b, a);
    sync(a, b);
    const sec = (i + 1) * 30;
    if ((i + 1) % 5 === 0) film.look(a, `${Math.floor(sec / 60)} min${sec % 60 ? ` ${sec % 60} s` : ''} plus tard`);
  }
  const log = a.state.log.map((l) => l.text);
  assert.ok(log.some((t) => t.includes('(fil)')), 'lancement automatique noté au journal');
  assert.equal(pa().plan.length, 0, 'tout le fil est lancé');
  assert.equal(pa().levels.mine, 4);
  const r = replay(clone(a.snapshot()));
  film.look(a, 'tout le fil est lancé ; la partie rejouée retombe sur les mêmes fiches', [
    { show: 'fil', at: home, expected: [], got: pa().plan },
    { show: 'mines', at: home, expected: 4, got: pa().levels.mine },
    { show: 'lancement « (fil) » au journal', expected: true, got: log.some((t) => t.includes('(fil)')) },
    ...Object.values(a.state.players).map((p) => ({ show: `fiche de ${p.name} rejouée à l’identique`, at: p.home, expected: true, got: comparable(r.players[p.id]) === comparable(p) })),
  ]);
  for (const p of Object.values(a.state.players)) assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
});

scenario('un fil abîmé reçu d’un autre est nettoyé', (film) => {
  const { players } = newGame(1);
  film.look(players[0], 'la fiche de A, avant qu’on abîme son fil');
  const p = clone(players[0].state.players[players[0].me]);
  p.planet.plan = ['mine', '__proto__', 42, 'nope', ...Array(20).fill('mine')];
  const n = normalize(p);
  const cleaned = [...n.planet.plan]; // normalize réécrit la fiche : on garde ce premier résultat pour l'image
  assert.ok(n.planet.plan.every((k) => k === 'mine'));
  assert.equal(n.planet.plan.length, game.PLAN_MAX);
  p.planet.plan = 'mine';
  const notList = normalize(p).planet.plan;
  film.look(players[0], 'fils abîmés nettoyés à la réception (vérifiés sur une copie de la fiche de A)', [
    { show: 'fil reçu (« __proto__ », 42, « nope », 21 mines)', expected: Array(game.PLAN_MAX).fill('mine'), got: cleaned },
    { show: 'fil reçu en texte au lieu d’une liste', expected: [], got: notList },
  ]);
  assert.deepEqual(notList, []);
});

// ---------------------------------------------------------------------------
// Recherches et vaisseaux au fil (D-158) : un seul fil, trois chantiers qui avancent ensemble.
// ---------------------------------------------------------------------------

/** Planète humaine riche, avec labo et chantier naval, et la propulsion (qui ouvre le cargo). */
function rich() {
  const p = poor();
  p.levels = { ...p.levels, lab: 1, yard: 1, store: 6 };
  p.places = 40;
  p.tech = { propulsion: 1 };
  p.stock = { minerals: 5000, food: 2000, energy: 5000 };
  return p;
}

scenario('fil mixte : bâtiment, recherche et vaisseaux partent chacun à son chantier, en même temps', (film) => {
  const { show } = stage(film);
  const p = rich();
  p.plan = ['mine', { tech: 'forage' }, { ship: 'cargo', n: 2 }];
  show(p, 'A met au fil une mine, la recherche Forage et 2 cargos', T0);
  const s = game.stateAt(p, T0 + SEC);
  show(p, 'une seconde plus tard : les trois sont lancés, chacun à son chantier', T0 + SEC);
  assert.deepEqual(s.plan, []);
  assert.equal(s.queue.key, 'mine');
  assert.equal(s.research.key, 'forage');
  assert.equal(s.research.level, 1);
  assert.deepEqual([s.yard.type, s.yard.count], ['cargo', 2]);
  const starts = s.done.filter((d) => d.kind === 'start');
  assert.deepEqual(starts.map((d) => d.lane), ['queue', 'research', 'yard']);
  assert.ok(starts.every((d) => d.start === T0));
  // Payés tous les trois.
  const paid = game.upgradeCost('human', 'mine', 4).minerals + 150 + 2 * 110;
  assert.ok(Math.abs(5000 - paid - game.stateAt(p, T0).stock.minerals) < 50);
});

scenario('fil mixte : un chantier occupé ne bloque pas les autres, et chacun garde son ordre', (film) => {
  const { show } = stage(film);
  const p = rich();
  p.research = { key: 'agro', level: 1, start: T0, end: T0 + 30 * SEC };
  p.plan = [{ tech: 'forage' }, { tech: 'radar' }, 'solar'];
  show(p, 'labo occupé ; au fil : Forage, Radar, puis une centrale', T0);
  const s = game.stateAt(p, T0 + SEC);
  // La centrale ne passe pas après les recherches : son chantier est libre.
  assert.equal(s.queue?.key, 'solar');
  assert.deepEqual(s.plan, [{ tech: 'forage' }, { tech: 'radar' }]);
  // Labo libre : Forage d'abord, Radar ensuite.
  const later = game.stateAt(p, T0 + 10 * MIN);
  show(p, '10 min plus tard : Agronomie, Forage puis Radar, dans l’ordre', T0 + 10 * MIN);
  const techs = later.done.filter((d) => d.lane === 'research').map((d) => d.key);
  assert.deepEqual(techs, ['forage', 'radar']);
  assert.equal(later.tech.forage, 1);
  assert.equal(later.tech.radar, 1);
});

scenario('fil mixte : le premier élément prêt passe avant les autres sur le stock', (film) => {
  const { show } = stage(film);
  const p = rich();
  const cost = game.upgradeCost('human', 'mine', 4);
  p.stock = { minerals: cost.minerals - 100, food: 2000, energy: 5000 };
  p.plan = ['mine', { tech: 'radar' }];
  show(p, 'au fil : une mine (pas tout à fait payable), puis Radar (payable)', T0);
  const s = game.stateAt(p, T0 + 30 * MIN);
  const starts = s.done.filter((d) => d.kind === 'start');
  show(p, 'la mine part d’abord, Radar attend son tour', T0 + 30 * MIN);
  assert.deepEqual(starts.map((d) => d.lane), ['queue', 'research']);
  assert.ok(starts[0].start > T0, 'la mine attend ses minéraux');
  assert.ok(starts[1].start >= starts[0].start, 'Radar ne la double pas');
});

scenario('fil mixte : labo au fil, puis une recherche qui l’attend ; l’estimation le dit', (film) => {
  const { show } = stage(film);
  const p = rich();
  p.levels.lab = 0;
  p.plan = ['lab', { tech: 'forage' }];
  show(p, 'pas de labo : A met un labo au fil, puis Forage', T0);
  const s = game.stateAt(p, T0 + SEC);
  assert.equal(s.queue.key, 'lab');
  assert.deepEqual(s.plan, [{ tech: 'forage' }]);
  const f = game.planForecast(p, T0 + SEC);
  assert.equal(f.length, 1);
  assert.equal(f[0].lane, 'research');
  assert.equal(f[0].level, 1);
  assert.equal(f[0].start, s.queue.end, 'Forage part quand le labo est fini');
  const later = game.stateAt(p, s.queue.end + SEC);
  show(p, 'le labo fini, Forage est lancé', s.queue.end + SEC);
  assert.equal(later.research?.key, 'forage');
});

scenario('le joueur : recherches et vaisseaux au fil, refus, retrait, et la partie se rejoue à l’identique', (film) => {
  const { players, clock, sync } = newGame(2, ['human', 'machine']);
  const [a, b] = players;
  const toasts = [];
  a.ontoast = (m) => toasts.push(m);
  const pa = () => a.state.players[a.me].planet;
  const home = a.state.players[a.me].home;
  // Pas de labo ni de chantier naval : refusé, tant qu'ils ne sont pas au fil.
  a.planResearch('forage');
  a.planShips('cargo', 2);
  assert.equal(toasts.length, 2);
  assert.deepEqual(pa().plan || [], []);
  // Deux centrales et une mine d'abord : sans elles, le labo mange l'énergie et tout cale.
  a.planBuild('solar');
  a.planBuild('solar');
  a.planBuild('mine');
  a.planBuild('lab');
  a.planResearch('propulsion');
  a.planBuild('yard');
  a.planShips('cargo', 2); // la propulsion au fil ouvre le cargo
  a.planShips('fighter', 1); // la frégate demande le blindage : refusé
  a.planResearch('colonies'); // il faut la propulsion 2 et un labo 2 : refusé
  assert.equal(toasts.length, 4);
  const wanted = ['solar', 'mine', 'lab', { tech: 'propulsion' }, 'yard', { ship: 'cargo', n: 2 }];
  film.look(a, 'A met au fil 2 centrales, mine, labo, Propulsion, chantier naval, 2 cargos (une frégate et les Arches refusées)', [
    { show: 'fil (la 1ʳᵉ centrale, payable, déjà lancée)', at: home, expected: wanted, got: pa().plan },
  ]);
  assert.equal(pa().queue.key, 'solar', 'le stock de départ paie la 1ʳᵉ centrale : lancée tout de suite');
  assert.deepEqual(pa().plan, wanted);
  a.unplan('ship:cargo:5', 5); // ce n'est pas ce lot-là : refusé
  assert.equal(pa().plan.length, 6);
  a.planResearch('forage');
  a.unplan('tech:forage', 6);
  assert.deepEqual(pa().plan, wanted);
  // Le stock de départ ne paie rien de tout ça : le fil attend la production, sans que A repasse.
  let min = 0;
  while (min < 180 && !(pa().ships?.cargo >= 2)) {
    min += 1;
    clock.t += MIN;
    a.tick();
    b.tick();
    sync(b, a);
    sync(a, b);
  }
  const log = a.state.log.map((l) => l.text);
  assert.ok(log.some((t) => t.includes('lance la recherche Propulsion chimique niv. 1') && t.includes('(fil)')));
  assert.ok(log.some((t) => t.includes('met en chantier 2 ×') && t.includes('(fil)')));
  assert.equal(pa().plan.length, 0, 'tout le fil est lancé');
  assert.equal(pa().tech.propulsion, 1);
  assert.equal(pa().ships.cargo, 2);
  // L'autre téléphone voit le même fil, et la partie se rejoue à l'identique.
  const r = replay(clone(a.snapshot()));
  film.look(a, `${min} min plus tard : tout est lancé et fini ; la partie rejouée retombe sur les mêmes fiches`, [
    { show: 'cargos à quai', at: home, expected: 2, got: pa().ships.cargo },
    { show: 'Propulsion', at: home, expected: 1, got: pa().tech.propulsion },
    ...Object.values(a.state.players).map((p) => ({ show: `fiche de ${p.name} rejouée à l’identique`, at: p.home, expected: true, got: comparable(r.players[p.id]) === comparable(p) })),
  ]);
  for (const p of Object.values(a.state.players)) assert.equal(comparable(r.players[p.id]), comparable(p), `fiche de ${p.name}`);
});

scenario('un fil mixte abîmé reçu d’un autre est nettoyé', (film) => {
  const { players } = newGame(1, ['human']);
  film.look(players[0], 'la fiche de A, avant qu’on abîme son fil');
  const p = clone(players[0].state.players[players[0].me]);
  p.planet.plan = ['mine', { tech: 'forage', x: 1 }, { tech: 'nope' }, { tech: '__proto__' }, { ship: 'cargo', n: 3 }, { ship: 'cargo', n: 0 }, { ship: 'cargo', n: 2.5 }, { ship: 'cargo', n: 99 }, { ship: 'nope', n: 1 }, null, [1]];
  const cleaned = normalize(p).planet.plan;
  film.look(players[0], 'fil reçu nettoyé (vérifié sur une copie de la fiche de A)', [
    { show: 'fil gardé', expected: ['mine', { tech: 'forage' }, { ship: 'cargo', n: 3 }], got: cleaned },
  ]);
  assert.deepEqual(cleaned, ['mine', { tech: 'forage' }, { ship: 'cargo', n: 3 }]);
});
