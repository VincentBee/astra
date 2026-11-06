// Fin de partie : le froid part du bord et se resserre vers le soleil ; une
// planète qu'il atteint est perdue, une planète peut aussi être conquise.
// Sans planète, on est éliminé ; le dernier joueur en vie gagne.
import { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { newGame, game, fleet } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

afterEach(() => {
  game.FROST.delayMs = Infinity;
  game.FROST.durationMs = 24 * 60_000;
});

/** Froid actif : il part tout de suite et atteint le soleil en 10 min. */
const frost = () => Object.assign(game.FROST, { delayMs: 0, durationMs: 10 * 60_000 });
const me = (s) => s.state.players[s.me];
/** Le propriétaire de la case `cell` vu par `s`, en lettre (A, B) : pour les étiquettes. */
const owner = (s, cell, A, B) => ({ [A.me]: 'A', [B.me]: 'B' })[s.ownerAt(cell)?.id] || 'personne';

scenario('le score compte toutes les planètes, les recherches et les vaisseaux', (film) => {
  const { players: [A] } = newGame(1, ['human']);
  const p = me(A);
  film.look(A, 'A sur sa planète mère, sans plus');
  const before = A.scoreOf(p);
  p.planet.ships = { ...(p.planet.ships || {}), fighter: 10 };
  const withShips = A.scoreOf(p);
  film.look(A, '10 frégates à quai en plus : le score monte', [{ show: 'score', at: p.home, expected: `plus de ${Math.round(before)}`, got: withShips, ok: withShips > before }]);
  assert.ok(withShips > before, 'les vaisseaux comptent');
  p.colonies = { [A.planets[5].id]: { ...p.planet, levels: { mine: 3 }, ships: {} } };
  film.look(A, 'et une colonie : le score monte encore', [{ show: 'score', at: A.planets[5], expected: `plus de ${Math.round(withShips)}`, got: A.scoreOf(p), ok: A.scoreOf(p) > withShips }]);
  assert.ok(A.scoreOf(p) > withShips, 'les colonies comptent');
});

scenario('le froid prend d’abord les planètes loin du soleil, puis les plus proches', (film) => {
  frost();
  const { players: [A] } = newGame(1, ['human']);
  const at = A.planets.slice(0, 14).map((w) => A.frostOf(w));
  const near = A.planets.slice(0, 14).sort((a, b) => A.frostOf(b) - A.frostOf(a))[0];
  const far = A.planets.slice(0, 14).sort((a, b) => A.frostOf(a) - A.frostOf(b))[0];
  const min = (w) => (A.frostOf(w) - A.startedAt) / 60_000;
  film.look(A, 'le froid part du bord, vers le soleil : la planète du bord gèle avant celle près du soleil', [
    { show: `${far.name} (au bord) gèle après, en min`, at: far, expected: `moins que ${near.name}`, got: min(far), ok: A.frostOf(far) < A.frostOf(near) },
    { show: `${near.name} (près du soleil) gèle après, en min`, at: near, expected: '10 au plus', got: min(near), ok: min(near) <= 10 },
    { show: 'tout gelé après, en min', expected: '10 au plus', got: (Math.max(...at) - A.startedAt) / 60_000, ok: Math.max(...at) <= A.startedAt + 10 * 60_000 },
  ]);
  assert.ok(A.frostOf(far) < A.frostOf(near));
  assert.ok(Math.max(...at) <= A.startedAt + 10 * 60_000);
});

scenario('planète mère gelée : la plus vieille colonie en vie la remplace, puis élimination', (film) => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  const p = me(A);
  // Deux colonies : une plus près du soleil que la planète mère, une plus loin.
  const byFrost = A.planets.slice(0, 14).filter((w) => !game.sameCell(w, p.home)).sort((a, b) => A.frostOf(a) - A.frostOf(b));
  const outer = byFrost[0];
  const inner = byFrost[byFrost.length - 1];
  const colony = (w, t) => ({ ...game.newPlanet('human', t, w), claimAt: t });
  p.colonies = { [outer.id]: colony(outer, clock.t), [inner.id]: colony(inner, clock.t + 1) };
  const home = { ...p.home };
  film.look(A, 'A : sa planète mère et deux colonies');
  clock.t = Math.max(A.frostOf(outer), A.frostOf(home)) + 1;
  A.tick();
  film.look(A, 'la planète mère et la colonie du bord ont gelé : la colonie au chaud devient planète mère', [
    { show: 'nouvelle planète mère', at: inner, expected: inner.name, got: game.sameCell(p.home, inner) ? inner.name : 'ailleurs' },
    { show: 'colonies', expected: 0, got: Object.keys(p.colonies).length },
    { show: 'partie finie', expected: false, got: !!A.over },
  ]);
  assert.ok(game.sameCell(p.home, inner), 'la colonie la plus au chaud devient planète mère');
  assert.deepEqual(Object.keys(p.colonies), []);
  assert.equal(A.over, null);
  clock.t = A.frostOf(inner) + 1;
  A.tick();
  film.look(A, 'la dernière colonie gèle : A est éliminé', [
    { show: 'A éliminé', at: inner, expected: `à l’heure du gel de ${inner.name}`, got: p.out === A.frostOf(inner) ? `à l’heure du gel de ${inner.name}` : 'pas à cette heure', ok: p.out === A.frostOf(inner) },
    { show: 'partie finie', expected: true, got: !!A.over },
    { show: 'gagnant (seul et éliminé : personne, D-142)', expected: null, got: A.over?.winner },
  ]);
  assert.equal(p.out, A.frostOf(inner), 'éliminé à l’heure où le froid a pris sa dernière planète');
  assert.ok(A.over, 'seul : la partie finit quand le froid a tout pris');
  assert.equal(A.over.winner, null, 'seul et éliminé : personne ne gagne (D-142)');
});

scenario('seul et éliminé : la partie finit sur une défaite, pas une victoire', (film) => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  film.look(A, 'A joue seul ; le froid arrive');
  clock.t = A.frostOf(me(A).home) + 1;
  A.tick();
  film.look(A, 'le froid a pris sa planète : A est éliminé, la partie est finie, sans gagnant', [
    { show: 'A éliminé', expected: true, got: Number.isFinite(me(A).out) },
    { show: 'gagnant', expected: null, got: A.over?.winner },
  ]);
  assert.ok(Number.isFinite(me(A).out), 'A est éliminé');
  assert.equal(A.over?.winner, null, 'pas de « Victoire ! » pour un joueur seul qui a tout perdu');
  assert.ok(A.state.log.some((e) => /le froid a tout pris/.test(e.text)), 'le journal le dit');
  // Partie seule finie avant D-142 : la fiche dit encore « A gagne ».
  me(A).over = { at: me(A).out, winner: A.me };
  film.look(A, 'vieille fiche : « A gagne » écrit avant la correction ; lue comme perdue', [{ show: 'gagnant', expected: null, got: A.over.winner }]);
  assert.equal(A.over.winner, null, 'une vieille partie seule se lit aussi comme perdue');
});

scenario('à deux, celui que le froid prend en dernier gagne, même si l’autre est hors ligne', (film) => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  const [first, last] = A.frostOf(me(A).home) < A.frostOf(me(B).home) ? [A, B] : [B, A];
  film.look(last, 'deux joueurs, le froid arrive');
  clock.t = first.frostOf(me(first).home) + 1;
  last.tick(); // le perdant n'a pas rouvert l'appli : le gagnant voit quand même qu'il a tout perdu
  film.look(last, 'la planète de l’autre a gelé : il gagne', [{ show: 'gagnant', at: me(last).home, expected: last.me, got: last.over?.winner }]);
  assert.equal(last.over?.winner, last.me);
  sync(first, last);
  film.look(first, 'le perdant reçoit la fin de partie', [{ show: 'gagnant, chez le perdant', expected: last.me, got: first.over?.winner }]);
  assert.equal(first.over?.winner, last.me, 'la fin se propage');
  const levels = JSON.stringify(me(first).planet.levels);
  first.build('mine');
  film.look(first, 'le perdant ordonne une mine après la fin : rien ne change', [{ show: 'bâtiments changés', expected: false, got: JSON.stringify(me(first).planet.levels) !== levels }]);
  assert.equal(JSON.stringify(me(first).planet.levels), levels, 'plus d’ordres après la fin');
});

/** A envoie `ships` conquérir (ou attaquer) la planète mère de B, déjà en orbite ; B a les bâtiments `defense` en plus. */
function assault(kind, ships, defense = {}, film) {
  const g = newGame(2, ['human', 'machine']);
  const { players: [A, B], clock, sync } = g;
  const cell = { ...me(B).home };
  Object.assign(me(B).planet.levels, defense);
  B.touch();
  sync(A, B);
  me(A).planet.ships = { ...ships };
  const id = A.takeOff('home', { ...ships }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  clock.t += 1000;
  film?.look(A, `la flotte de A en orbite de la planète mère de B (ordre : ${kind})`);
  A.moveFleet(id, cell, kind);
  A.tick();
  return { ...g, A, B, cell, id };
}

scenario('la défense d’une planète vient de ses bâtiments, et de sa race', (film) => {
  // Trois joueurs, un par race, dont la planète mère a exactement les bâtiments des assert (et,
  // pour l'alien, 5,7 de population psionique) : chaque image ouvre la fiche de l'une d'elles.
  const { players: [H, M, X] } = newGame(3, ['human', 'machine', 'alien']);
  me(H).planet.levels = { mine: 2, cannon: 1, shield: 1 };
  me(M).planet.levels = { turret: 2 };
  Object.assign(me(X).planet, { levels: { spines: 1, dome: 1 }, pop: 5.7 });
  film.look(H, 'humain : 2 mines, 1 canon, 1 bouclier', [{ sheet: me(H).home, button: true }]);
  film.look(M, 'machine : 2 tourelles', [{ sheet: me(M).home, button: true }]);
  film.look(X, 'alien : 1 épine, 1 dôme, 5,7 psioniques', [{ sheet: me(X).home, button: true }]);
  assert.deepEqual(game.fortOf('human', { mine: 2, cannon: 1, shield: 1 }), { attack: 2 * 2 + 12, hull: 2 * 20 + 40 + 150 });
  assert.deepEqual(game.fortOf('machine', { turret: 2 }), { attack: 36, hull: 30 });
  assert.deepEqual(game.fortOf('alien', { spines: 1, dome: 1 }, 5.7), { attack: 8 + 5, hull: 60 + 260 }, 'les épines mordent plus avec plus de psioniques');
  assert.deepEqual(game.fortOf('human', {}), { attack: 0, hull: 0 });
});

scenario('conquérir la planète mère d’un joueur sans colonie l’élimine', (film) => {
  const { A, B, clock, sync, cell, id } = assault('conquer', { fighter: 30 }, {}, film);
  film.look(A, 'combat : A a pris la planète, sa flotte s’y est posée', [
    { show: 'à qui', at: cell, expected: 'A', got: owner(A, cell, A, B) },
    { show: 'colonies de A', expected: 1, got: Object.values(me(A).colonies || {}).length },
    { show: 'flotte posée', expected: true, got: A.myFleet(id) === null },
  ]);
  assert.equal(A.ownerAt(cell)?.id, A.me, 'la planète est à A avant même que B lise le rapport');
  assert.equal(Object.values(me(A).colonies || {}).length, 1, 'A y a une colonie');
  assert.equal(A.myFleet(id), null, 'la flotte s’y est posée');
  sync(B, A);
  clock.t += 1000;
  B.tick();
  film.look(B, 'B lit le rapport : il n’a plus de planète, il est éliminé', [
    { show: 'planète mère de B', expected: 'aucune', got: me(B).home ? 'une' : 'aucune' },
    { show: 'B éliminé', expected: true, got: Number.isFinite(me(B).out) },
  ]);
  assert.equal(me(B).home, null);
  assert.ok(Number.isFinite(me(B).out), 'B est éliminé');
  sync(A, B);
  clock.t += 1000;
  A.tick();
  film.look(A, 'A apprend que B est éliminé : il gagne', [
    { show: 'gagnant', expected: A.me, got: A.over?.winner },
    { show: 'à qui', at: cell, expected: 'A', got: owner(A, cell, A, B) },
  ]);
  assert.equal(A.over?.winner, A.me);
  assert.equal(A.ownerAt(cell)?.id, A.me);
});

scenario('trop peu de vaisseaux d’attaque : les tourelles tiennent, ni prise ni pillage', (film) => {
  const { A, B, cell, id } = assault('conquer', { fighter: 3 }, { turret: 3 }, film);
  const left = A.myFleet(id)?.ships.fighter || 0;
  film.look(A, 'combat : les tourelles de B tiennent', [
    { show: 'à qui', at: cell, expected: 'B', got: owner(A, cell, A, B) },
    { show: 'chasseurs de A restants', at: [A, id], expected: 'moins de 3', got: left, ok: left < 3 },
    { show: 'minéraux pillés', expected: 0, got: me(A).effects.at(-1).take.minerals ?? 0 },
  ]);
  assert.equal(A.ownerAt(cell)?.id, B.me);
  assert.ok((A.myFleet(id)?.ships.fighter || 0) < 3, 'les tourelles ont abattu des frégates');
  assert.equal(me(A).effects.at(-1).take.minerals ?? 0, 0, 'rien de pillé');
});

scenario('un colonisateur ne prend pas une planète habitée, une attaque pille sans prendre', (film) => {
  const colo = assault('conquer', { colony: 1 }, {}, film);
  film.look(colo.A, 'un colonisateur seul : la planète reste à B', [{ show: 'à qui', at: colo.cell, expected: 'B', got: owner(colo.A, colo.cell, colo.A, colo.B) }]);
  assert.equal(colo.A.ownerAt(colo.cell)?.id, colo.B.me, 'pas d’armes : pas de conquête');
  const raid = assault('attack', { fighter: 30 }, {}, film);
  film.look(raid.A, 'attaque : B est pillé, mais garde sa planète', [{ show: 'à qui', at: raid.cell, expected: 'B', got: owner(raid.A, raid.cell, raid.A, raid.B) }]);
  assert.equal(raid.A.ownerAt(raid.cell)?.id, raid.B.me, 'l’ordre « attaquer » ne prend pas la planète');
});

/** A a une flotte en orbite sur la planète mère de B, qui a `docked` posés et `defense` en bâtiments. */
function facing(ships, docked = {}, defense = {}) {
  const g = newGame(2, ['human', 'machine']);
  const { players: [A, B], sync } = g;
  const cell = { ...me(B).home };
  Object.assign(me(B).planet.levels, defense);
  me(B).planet.ships = { ...docked };
  B.touch();
  sync(A, B);
  me(A).planet.ships = { ...ships };
  const id = A.takeOff('home', { ...ships }, {}, 0);
  Object.assign(A.myFleet(id), { from: { ...cell }, to: { ...cell }, fuel: 1000 });
  return { A, B, cell, id };
}

scenario('« Attaquer » et « Conquérir » comptent les vaisseaux posés et estiment le combat', (film) => {
  const { A, cell, id } = facing({ fighter: 3 }, { fighter: 7, heavy: 9 });
  film.look(A, '3 frégates de A face à la planète mère de B, 16 vaisseaux posés');
  const orders = A.ordersAt(id, cell);
  const conquer = orders.find((x) => x.kind === 'conquer');
  film.look(A, 'l’ordre « Conquérir » compte les 16 vaisseaux posés', [
    { show: 'vaisseaux posés comptés', at: cell, expected: '+ 16 vaisseaux posés', got: conquer.label.match(/\+ [^·]+/)?.[0].trim(), ok: /\+ 16 vaisseaux posés/.test(conquer.label) },
    { show: 'estimation', at: [A, id], expected: 'lose', got: conquer.odds },
  ]);
  for (const kind of ['attack', 'conquer']) {
    const o = orders.find((x) => x.kind === kind);
    assert.match(o.label, /défense ⚔ \d+ ◇ \d+ \+ 16 vaisseaux posés/, kind);
    assert.equal(o.odds, 'lose', `${kind} : 3 vaisseaux contre 16, perdu d’avance`);
    assert.match(o.label, /bataille perdue/);
  }
});

scenario('la même planète sans vaisseaux posés : victoire probable', (film) => {
  const { A, cell, id } = facing({ fighter: 30 });
  film.look(A, '30 frégates de A face à une planète sans vaisseaux');
  const o = A.ordersAt(id, cell).find((x) => x.kind === 'conquer');
  film.look(A, 'l’ordre « Conquérir » : rien de posé, victoire probable', [
    { show: 'estimation', at: [A, id], expected: 'win', got: o.odds },
  ]);
  assert.equal(o.odds, 'win');
  assert.match(o.label, /\+ 0 vaisseau posé · victoire probable/);
});

scenario('hors de ma détection : ni défense, ni vaisseaux posés, ni estimation (D-190)', (film) => {
  const { A, B, cell, id } = facing({ fighter: 30 }, { fighter: 7 });
  A.ordersAt(id, cell); // A la voit encore : il retient à qui elle est (D-124)
  film.look(A, '30 frégates de A face à 7 vaisseaux posés, avant de perdre la vue');
  A.eyes = () => [];
  const o = A.ordersAt(id, cell).find((x) => x.kind === 'conquer');
  film.look(A, 'plus de vue : l’ordre reste, sans l’état de la planète', [
    { show: 'ordre', at: cell, expected: 'Conquérir … · hors de portée : défense inconnue', got: o.label, ok: /hors de portée : défense inconnue$/.test(o.label) },
    { show: 'estimation', at: [A, id], expected: null, got: o.odds ?? null },
  ]);
  assert.doesNotMatch(o.label, /⚔|◇|vaisseau|victoire|bataille/);
  assert.equal(o.odds, undefined);
  assert.match(A.ordersAt(id, cell).find((x) => x.kind === 'attack').label, new RegExp(`\\(${me(B).name}\\)`), 'le propriétaire retenu reste nommé');
});

scenario('une partie d’avant la course n’a ni froid ni fin', (film) => {
  frost();
  const { players: [A], clock } = newGame(1, ['human']);
  delete me(A).since; // fiche d'avant la course
  film.look(A, 'fiche d’avant la course');
  clock.t += 60 * 60_000;
  A.tick();
  film.look(A, 'une heure plus tard : rien n’a gelé', [
    { show: 'planète mère', at: me(A).home, expected: 'là', got: me(A).home ? 'là' : 'gelée' },
    { show: 'départ de la course', expected: 'aucun', got: A.startedAt === null ? 'aucun' : A.startedAt },
    { show: 'partie finie', expected: false, got: !!A.over },
  ]);
  assert.equal(A.over, null);
  assert.equal(A.startedAt, null);
  assert.ok(me(A).home, 'la planète mère n’a pas gelé');
});

scenario('mort simultanée : le meilleur score d’avant la chute gagne, les points tombent à 0', (film) => {
  frost();
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'machine']);
  // Tout l'anneau gèle à la même heure. B (p1, après A dans l'ordre des noms) est le plus riche,
  // mais grâce à sa colonie : sa planète mère seule vaut moins que celle de A.
  const T = clock.t + 60_000;
  for (const s of [A, B]) s.frostOf = () => T;
  Object.assign(me(A).planet.levels, { mine: 6 });
  me(B).colonies = { [B.planets[5].id]: { ...game.newPlanet('machine', clock.t, B.planets[5]), levels: { drill: 12 }, claimAt: clock.t } };
  B.touch();
  sync(A, B);
  const rich = B.scoreOf(me(B));
  const homeOnly = game.empireScore('machine', [me(B).planet]);
  film.look(A, 'B a une colonie, A une planète mère plus riche : B mène grâce à sa colonie', [
    { show: 'score de B', at: B.planets[5], expected: `plus que A (${Math.round(A.scoreOf(me(A)))})`, got: rich, ok: rich > A.scoreOf(me(A)) },
    { show: 'planète mère de B seule', at: me(B).home, expected: `moins que A`, got: homeOnly, ok: homeOnly < A.scoreOf(me(A)) },
  ]);
  assert.ok(rich > A.scoreOf(me(A)), 'B mène');
  assert.ok(game.empireScore('machine', [me(B).planet]) < A.scoreOf(me(A)), 'sa planète mère seule ne suffit pas');
  clock.t = T + 1;
  A.tick(); // A voit sa chute, et la fiche de B pas encore à jour
  film.look(A, 'tout l’anneau gèle : A voit sa chute', [
    { show: 'score de A', expected: 0, got: A.scoreOf(me(A)) },
    { show: 'gagnant, vu par A', expected: B.me, got: A.over?.winner },
  ]);
  assert.equal(A.scoreOf(me(A)), 0, 'A a tout perdu : 0 point');
  assert.equal(A.over?.winner, B.me);
  B.tick();
  film.look(B, 'B tombe aussi, mais garde ses points d’avant la chute', [
    { show: 'score de B', expected: 0, got: B.scoreOf(me(B)) },
    { show: 'points d’avant la chute', expected: rich, got: me(B).deathPts },
  ]);
  assert.equal(B.scoreOf(me(B)), 0, 'B aussi');
  assert.equal(me(B).deathPts, rich, 'B garde ses points d’avant la chute');
  sync(A, B);
  sync(B, A);
  film.look(B, 'fiches échangées : B gagne aux points d’avant la chute', [
    { show: 'gagnant, chez B', expected: B.me, got: B.over?.winner },
    { show: 'gagnant, chez A', expected: B.me, got: A.over?.winner },
  ]);
  assert.equal(B.over?.winner, B.me);
  assert.equal(A.over?.winner, B.me);
});
