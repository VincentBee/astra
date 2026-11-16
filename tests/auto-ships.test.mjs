// Achat automatique de vaisseaux (D-530) : une règle { ship, n } par planète. Chantier naval
// libre, plus aucun lot au fil et stock suffisant, un lot part tout seul, encore et encore. Elle
// se calcule dans stateAt, comme le fil : même résultat téléphone éteint, au rattrapage et au
// rejeu. Le fil passe avant elle.
//
// En scénario (D-129) : la planète testée devient celle du joueur A dans une vraie partie, et
// l'image ouvre sa fiche, telle que le vrai jeu la dessine à cet instant.
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { replay, replayable, comparable } = await import('../js/regles/replay/index.js');
const { normalize, AUTO_SETTLE } = await import('../js/session/index.js');
const { TECHS, SHIPS, shipUnlock } = await import('../js/regles/tech/index.js');
const scenario = scenarios(import.meta.url);

const T0 = 10_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

/** Une planète humaine avec un chantier naval et le Cargo recherché ; `rich` : de quoi tourner. */
function yardPlanet({ rich = true } = {}) {
  const p = game.newPlanet('human', T0, game.planetsFor('gtest')[0]);
  p.levels = { ...p.levels, yard: 2, ...(rich ? { mine: 6, solar: 6, farm: 3, store: 3 } : {}) };
  const u = shipUnlock('human', 'cargo');
  p.tech = { [u.key]: u.level };
  p.stock = rich ? { minerals: 0, food: 300, energy: 0 } : { minerals: 0, food: 300, energy: 0 };
  return p;
}

/** Comme plan.test.mjs : la planète de A devient `p`, et A la touche à cette heure-là. */
function stage(film) {
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  const show = (p, label, t = clock.t, expect = []) => {
    P.planet = p;
    clock.t = t;
    film.look(A, label, [{ sheet: P.home, button: true }, ...expect]);
  };
  return { A, clock, show };
}

const autoStarts = (s) => s.done.filter((d) => d.kind === 'start' && d.auto);
const cargoCost = SHIPS.human.cargo.cost;

scenario('une règle 1 × Cargo achète des lots tout seuls, même pendant une longue absence', (film) => {
  const { A, clock, show } = stage(film);
  const p = yardPlanet();
  p.auto = { ship: 'cargo', n: 1 };
  show(p, 'A règle « 1 × Cargo en automatique » ; stock vide, des revenus');
  film.roll(A, clock, T0 + 20 * MIN, 'les revenus rentrent, les cargos partent');
  const s20 = game.stateAt(p, T0 + 20 * MIN);
  const s8h = game.stateAt(p, T0 + 8 * HOUR);
  const n20 = s20.ships.cargo || 0;
  const n8h = s8h.ships.cargo || 0;
  show(p, '8 h d’absence : la planète a acheté des cargos toute seule', T0 + 8 * HOUR, [
    { show: 'cargos après 20 min', expected: true, got: n20 > 0, ok: n20 > 0 },
    { show: 'cargos après 8 h', expected: true, got: n8h > n20, ok: n8h > n20 },
  ]);
  assert.ok(n20 > 0, 'des cargos au bout de 20 min');
  assert.ok(n8h > n20, 'encore plus au bout de 8 h');
  // Chaque lot est un vrai lot du chantier naval : un lancement, puis une fin, l'un après l'autre.
  const starts = autoStarts(s8h);
  assert.ok(starts.length >= n8h, 'un lancement par lot reçu (le dernier peut être encore en chantier)');
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i].start >= starts[i - 1].end, 'un seul lot à la fois au chantier naval');
  // La règle reste sur la planète : rien ne la consomme.
  assert.deepEqual(s8h.auto, { ship: 'cargo', n: 1 });
  // Même calcul, deux copies de la même fiche : le même résultat (chaque téléphone calcule pareil).
  assert.equal(JSON.stringify(game.stateAt(clone(p), T0 + 8 * HOUR).ships), JSON.stringify(s8h.ships));
});

scenario('jamais sans les fonds : pas de revenu, pas de vaisseau ; jamais de stock négatif', (film) => {
  const { show } = stage(film);
  // Sans mines ni centrales : le stock ne couvrira jamais un cargo.
  const p = yardPlanet({ rich: false });
  p.levels = { ...p.levels, mine: 0, solar: 0 };
  p.auto = { ship: 'cargo', n: 1 };
  const s = game.stateAt(p, T0 + 8 * HOUR);
  show(p, 'A règle « 1 × Cargo » sans aucun revenu : 8 h plus tard, rien', T0 + 8 * HOUR, [{ show: 'cargos achetés', expected: 0, got: s.ships.cargo || 0 }]);
  assert.equal(s.ships.cargo || 0, 0);
  assert.equal(autoStarts(s).length, 0);
  // Avec des revenus : à chaque lancement, le stock couvrait le prix (il ne passe jamais sous 0).
  const q = yardPlanet();
  q.auto = { ship: 'cargo', n: 3 };
  const end = game.stateAt(q, T0 + 2 * HOUR);
  const starts = autoStarts(end);
  assert.ok(starts.length > 0);
  for (const d of starts) {
    const at = game.stateAt(q, d.start);
    for (const r of Object.keys(cargoCost)) assert.ok(at.stock[r] >= -1e-6, `${r} jamais négatif (${at.stock[r]})`);
  }
});

scenario('le fil passe avant la règle : son lot de vaisseaux, puis son bâtiment payable', (film) => {
  const { show } = stage(film);
  const p = yardPlanet();
  p.stock = { minerals: 5000, food: 300, energy: 5000 };
  p.plan = [{ ship: 'fighter', n: 2 }];
  p.tech = { ...p.tech, [shipUnlock('human', 'fighter').key]: shipUnlock('human', 'fighter').level };
  p.auto = { ship: 'cargo', n: 1 };
  const s = game.stateAt(p, T0 + 30 * game.SPEED);
  const first = s.done.find((d) => d.kind === 'start');
  show(p, 'A a 2 frégates au fil et la règle « 1 × Cargo » : les frégates d’abord', T0 + 1000, [{ show: 'premier lot lancé', expected: 'fighter', got: first?.type }]);
  assert.equal(first.type, 'fighter');
  assert.ok(!first.auto, 'le premier lot vient du fil');
  const next = s.done.filter((d) => d.kind === 'start')[1];
  assert.ok(next?.auto, 'la règle reprend le chantier naval une fois le fil vidé de ses vaisseaux');
  assert.ok(next.start >= first.end);

  // Un bâtiment prêt du fil garde la priorité sur le stock : la règle attend qu'il soit lancé.
  const b = yardPlanet();
  b.stock = { minerals: 0, food: 300, energy: 0 };
  delete b.places; // de la place pour la mine
  b.plan = ['mine'];
  b.auto = { ship: 'cargo', n: 1 };
  const sb = game.stateAt(b, T0 + 2 * HOUR);
  const mine = sb.done.find((d) => d.kind === 'start' && d.lane === 'queue');
  const ship = autoStarts(sb)[0];
  assert.ok(mine && ship, 'la mine et un cargo sont lancés');
  assert.ok(mine.start <= ship.start, 'la mine d’abord');
});

scenario('arrêter la règle arrête les achats ; un nouveau réglage remplace l’ancien', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  const toasts = [];
  A.ontoast = (t) => toasts.push(t);
  const p = yardPlanet();
  p.at = clock.t;
  P.planet = p;
  A.setAutoShips('cargo', 1);
  assert.deepEqual(P.planet.auto, { ship: 'cargo', n: 1 });
  // La règle vaut à partir de maintenant : rien n'est acheté dans le passé.
  assert.equal(game.stateAt(P.planet, clock.t).ships.cargo || 0, 0);
  for (let i = 0; i < 30; i++) {
    clock.t += MIN;
    A.tick();
  }
  const before = game.stateAt(P.planet, clock.t).ships.cargo || 0;
  film.look(A, 'A a laissé tourner « 1 × Cargo » 30 min', [{ show: 'cargos', expected: true, got: before > 0, ok: before > 0 }]);
  assert.ok(before > 0);
  A.setAutoShips('cargo', 5);
  assert.deepEqual(P.planet.auto, { ship: 'cargo', n: 5 }, 'une seule règle : la nouvelle remplace l’ancienne');
  // On arrête pendant qu'un lot de la règle est en chantier.
  for (let i = 0; i < 600 && !game.stateAt(P.planet, clock.t).yard?.auto; i++) clock.t += 1000;
  assert.ok(game.stateAt(P.planet, clock.t).yard?.auto, 'un lot automatique en chantier');
  A.setAutoShips(null, 0);
  assert.equal(P.planet.auto, undefined);
  const stopped = game.stateAt(P.planet, clock.t);
  const busy = stopped.yard ? stopped.yard.count : 0; // un lot déjà payé finit quand même
  assert.ok(busy > 0);
  const after = game.stateAt(P.planet, clock.t + 4 * HOUR).ships.cargo || 0;
  film.look(A, 'A arrête la règle : plus aucun cargo acheté', [{ show: 'cargos 4 h plus tard', expected: (stopped.ships.cargo || 0) + busy, got: after }]);
  assert.equal(after, (stopped.ships.cargo || 0) + busy);
  assert.ok(A.state.log.some((l) => /arrête l’achat automatique/.test(l.text)));
  // Le dernier lot de la règle arrêtée finit comme un lot ordinaire : la fiche le reçoit au passage suivant.
  clock.t += 10 * MIN;
  A.tick();
  assert.equal(P.planet.yard, null, 'plus de lot coincé en chantier dans la fiche');
  assert.equal(P.planet.ships.cargo || 0, (stopped.ships.cargo || 0) + busy);
});

scenario('règle invalide : refusée par l’ordre, nettoyée dans une fiche reçue', () => {
  // Le moteur ne garde que { ship, n } d'un vaisseau de la race, n entier de 1 à 50.
  assert.deepEqual(game.autoRule('human', { ship: 'cargo', n: 3, extra: 1 }), { ship: 'cargo', n: 3 });
  for (const bad of [null, 'cargo', [], { ship: 'xwing', n: 1 }, { ship: 'cargo', n: 0 }, { ship: 'cargo', n: 51 }, { ship: 'cargo', n: 1.5 }, { ship: 'cargo', n: '2' }, { ship: '__proto__', n: 1 }, { ship: 'constructor', n: 1 }, { tech: 'weapons' }, 'mine']) {
    assert.equal(game.autoRule('human', bad), null, JSON.stringify(bad));
  }
  assert.equal(game.autoRule('nobody', { ship: 'cargo', n: 1 }), null, 'race inconnue');
  // stateAt ignore une règle trafiquée (pas de vaisseau inconnu dans le hangar).
  const p = yardPlanet();
  p.auto = { ship: 'xwing', n: 1 };
  assert.deepEqual(game.stateAt(p, T0 + HOUR).ships, {});

  // L'ordre : refus lisibles, rien n'est réglé.
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  const toasts = [];
  A.ontoast = (t) => toasts.push(t);
  A.setAutoShips('cargo', 1);
  assert.match(toasts.at(-1), /chantier naval/, 'pas de chantier naval');
  P.planet.levels.yard = 1;
  P.planet.at = clock.t;
  A.setAutoShips('heavy', 1);
  assert.match(toasts.at(-1), /pas encore recherché/);
  A.setAutoShips('xwing', 1);
  assert.match(toasts.at(-1), /inconnu/);
  for (const n of [51, 1.5, -1]) {
    A.setAutoShips('cargo', n);
    assert.match(toasts.at(-1), /Entre 1 et 50/);
  }
  // Un lot plus cher que l'entrepôt ne partirait jamais : refusé (comme D-441).
  const u = shipUnlock('human', 'cargo');
  P.planet.tech = { ...P.planet.tech, [u.key]: u.level };
  P.planet.levels.store = 0;
  A.setAutoShips('cargo', 50);
  assert.match(toasts.at(-1), /Entrepôt trop petit/);
  assert.equal(P.planet.auto, undefined);
  A.setAutoShips('cargo', 2);
  assert.deepEqual(P.planet.auto, { ship: 'cargo', n: 2 }, 'un petit lot passe');
  delete P.planet.auto;

  // Une fiche reçue : règle trafiquée retirée, règle valide recopiée sans le reste.
  const rec = clone(P);
  rec.planet.auto = { ship: 'xwing', n: 999 };
  rec.planet.yard = { type: 'cargo', count: 1, start: T0, end: T0 + 1000, auto: 'oui' };
  const clean = normalize(rec);
  assert.equal(clean.planet.auto, undefined);
  assert.equal(clean.planet.yard.auto, undefined);
  const ok = clone(P);
  ok.planet.auto = { ship: 'cargo', n: 2, hack: true };
  assert.deepEqual(normalize(ok).planet.auto, { ship: 'cargo', n: 2 });
});

scenario('le rejeu redonne la même fiche avec la règle, réglée puis arrêtée', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  // Tout par des ordres, comme depuis l'appli : centrales, chantier naval, labo, recherche du Cargo.
  for (const b of ['solar', 'yard', 'lab', 'solar', 'mine', 'solar', 'store', 'mine']) A.planBuild(b);
  A.planResearch(Object.keys(TECHS.human).find((k) => TECHS.human[k].unlock?.cargo));
  A.setAutoShips('cargo', 1);
  assert.deepEqual(P.planet.auto, { ship: 'cargo', n: 1 }, 'réglée tant que chantier et recherche sont au fil');
  let ticks = 0;
  for (let i = 0; i < 360; i++) {
    if (i === 300) A.setAutoShips(null, 0);
    clock.t += MIN;
    A.tick();
  }
  ticks = P.orders.filter((o) => o.k === 'tick').length;
  const state = clone(A.snapshot());
  assert.equal(replayable(state).ok, true);
  const r = replay(state);
  const got = game.stateAt(P.planet, clock.t).ships.cargo || 0;
  film.look(A, 'A a joué 6 h avec la règle (arrêtée à 5 h) ; sa fiche est rejouée', [
    { show: 'cargos achetés', expected: true, got: got > 0, ok: got > 0 },
    { show: 'fiche rejouée à l’identique', expected: true, got: r.faithful[A.me] },
  ]);
  assert.ok(got > 0, 'des cargos achetés');
  assert.equal(r.faithful[A.me], true);
  assert.equal(comparable(r.players[A.me]), comparable(P));
  assert.ok(r.log.some((l) => /achat auto/.test(l.text)), 'le journal rejoué dit ce que la règle a reçu');
  // L'achat automatique n'écrit la planète qu'au plus toutes les AUTO_SETTLE : le journal d'ordres ne déborde pas.
  assert.ok(ticks <= (300 * MIN) / AUTO_SETTLE + 20, `${ticks} passages notés en 6 h`);
});

scenario('une fiche datée de très loin : la règle s’arrête à AUTO_MAX lots par calcul', () => {
  const p = yardPlanet();
  p.stock = { minerals: 1e6, food: 300, energy: 1e6 };
  p.levels.store = 30;
  p.auto = { ship: 'cargo', n: 1 };
  const t = performance.now();
  const s = game.stateAt(p, T0 + 365 * 24 * HOUR);
  assert.ok(performance.now() - t < 2000, 'le calcul reste court');
  assert.equal(autoStarts(s).length, game.AUTO_MAX);
});

/** A, humain, sur `yardPlanet()` à l'heure de la partie ; `texts` reçoit chaque ligne de journal (le journal de la partie n'en garde que 40). */
function playing() {
  const { players: [A], clock } = newGame(1, ['human']);
  const P = A.state.players[A.me];
  const texts = [];
  const add = A.addLog.bind(A);
  A.addLog = (text, mark) => {
    texts.push(text);
    return add(text, mark);
  };
  const p = yardPlanet();
  p.at = clock.t;
  P.planet = p;
  return { A, P, clock, texts };
}

scenario('règle active et fil qui attend : la planète n’est pas écrite à chaque lot (AUTO_SETTLE)', () => {
  const { A, P, clock } = playing();
  // Une recherche au labo et une autre au fil : le fil attend, sans bâtiment en chantier.
  P.planet.levels.lab = 1;
  const keys = Object.keys(TECHS.human).filter((k) => !TECHS.human[k].requires);
  P.planet.research = { key: keys[0], level: 1, start: clock.t, end: clock.t + 10 * HOUR };
  P.planet.plan = [{ tech: keys[1] }];
  A.setAutoShips('cargo', 1);
  const before = P.orders.length;
  for (let i = 0; i < 1200; i++) {
    clock.t += 3000; // un passage toutes les 3 s, comme le vrai jeu (1 h)
    A.tick();
  }
  const ticks = P.orders.slice(before).filter((o) => o.k === 'tick').length;
  assert.ok(game.stateAt(P.planet, clock.t).ships.cargo > 100, 'la règle a acheté');
  assert.ok(ticks <= HOUR / AUTO_SETTLE + 2, `${ticks} passages notés en 1 h (12 attendus)`);
});

scenario('longue absence : au retour, settle ne perd aucun lot au-delà de AUTO_MAX', () => {
  const often = yardPlanet();
  often.levels = { ...often.levels, mine: 9, solar: 9, store: 6 };
  often.auto = { ship: 'cargo', n: 1 };
  const once = clone(often);
  for (let t = T0 + MIN; t <= T0 + 6 * HOUR; t += MIN) game.settle(often, t);
  game.settle(once, T0 + 6 * HOUR); // téléphone éteint 6 h : un seul calcul au retour
  const a = often.ships.cargo || 0;
  const b = once.ships.cargo || 0;
  assert.ok(a > game.AUTO_MAX, `${a} cargos avec des passages réguliers`);
  assert.ok(b > game.AUTO_MAX, `${b} cargos au retour : pas coupé à AUTO_MAX`);
  assert.ok(Math.abs(a - b) / a < 0.05, `à 5 % près : ${a} et ${b}`);
});

scenario('chaque vaisseau de la règle a sa ligne au journal, même écrit par un décollage', () => {
  const { A, P, clock, texts } = playing();
  A.setAutoShips('cargo', 1);
  let flown = 0;
  for (let i = 0; i < 60; i++) {
    clock.t += 15_000;
    A.tick();
    // Toutes les 4 min : un cargo décolle (launch écrit la planète, avec les lots pas encore notés).
    if (i % 16 === 15 && (game.stateAt(P.planet, clock.t).ships.cargo || 0) > 0) {
      if (A.takeOff('home', { cargo: 1 }, {}, 0)) flown++;
    }
  }
  A.setAutoShips(null, 0); // écrit tout
  clock.t += 10 * MIN;
  A.tick(); // le dernier lot de la règle arrêtée
  const logged = texts.map((t) => t.match(/reçoit (\d+) × Cargo Hermès .*\(achat auto\)/)).filter(Boolean).reduce((n, m) => n + Number(m[1]), 0);
  assert.ok(flown > 0, 'des cargos ont décollé');
  assert.equal(logged, (P.planet.ships.cargo || 0) + flown, 'cargos notés au journal = cargos reçus');
});
