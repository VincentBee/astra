// Joueurs IA (D-151). Une IA est un joueur comme un autre : sa propre Session, sa propre fiche,
// qu'elle est seule à écrire, avec les mêmes ordres que l'interface (chooseRace, ready,
// planBuild, research, buildShips, takeOff, moveFleet…). Elle tourne sur le téléphone de
// celui qui l'a ajoutée (l'hôte), reliée à sa Session par un lien en mémoire qui a la même
// interface qu'un lien WebRTC (js/peer.js) : les fiches voyagent comme entre deux téléphones,
// la partie se sauvegarde et se rejoue comme d'habitude, les autres téléphones reçoivent la
// fiche de l'IA de proche en proche (par l'hôte).
//
// Le cerveau (`think`) est pur côté interface : il lit l'état de sa Session et donne au plus
// quelques ordres par passage, seulement ceux qui passeront (un ordre refusé s'inscrit quand
// même au journal de la fiche). Il ne triche pas sur les règles ; il lit la défense des
// planètes adverses comme le menu « Conquérir … · défense ⚔ ◇ » la montre à un joueur.

import { Session } from './session.js';
import { RACES, PLAN_MAX, planAhead, stateAt, upgradeCost, startResearch, startShips, usedPlaces, sameCell, distance, fortOf, POWERS, powerReadyAt, powerCost, liftGain } from './game.js';
import { TECHS, SHIPS, shipUnlocked } from './tech.js';
import { fleetTank, fleetBurn, fuelAt, moving, countShips, armed, battle, fleetSpeed, tripMs, fleetPos, MAX_FLEETS } from './fleet.js';

/** Un passage de réflexion toutes les THINK_MS (le jeu, lui, avance toutes les secondes). */
export const THINK_MS = 3000;
/** Ordres donnés au plus par passage : une IA ne joue pas plus vite qu'un joueur rapide. */
const BUDGET = 3;
const MIN = 60_000;

const NAMES = ['IA Véga', 'IA Orion', 'IA Rigel', 'IA Deneb', 'IA Sirius', 'IA Altaïr', 'IA Antarès', 'IA Castor'];

/**
 * Ce que chaque race construit, cherche et arme. `steps` : niveaux à atteindre dans l'ordre
 * (le manque d'énergie, de nourriture ou de logement passe avant, voir chooseBuilding) ;
 * au-delà, l'IA monte tour à tour sa production et ses défenses. `techs` : une clé par
 * niveau voulu, dans l'ordre.
 */
const PLAYBOOK = {
  human: {
    energy: 'solar', food: 'farm', house: 'habitat', prod: ['mine'], defense: ['cannon', 'shield'],
    steps: [['mine', 2], ['solar', 2], ['farm', 2], ['habitat', 2], ['mine', 3], ['lab', 1], ['solar', 3], ['mine', 4], ['lab', 2], ['yard', 1], ['habitat', 3], ['mine', 5], ['cannon', 1], ['farm', 3], ['store', 1], ['yard', 2], ['cannon', 2], ['shield', 1]],
    techs: ['forage', 'propulsion', 'propulsion', 'colonies', 'blindage', 'forage', 'agro', 'armement', 'armement', 'blindage', 'forage', 'armement', 'blindage', 'agro', 'forage', 'armement'],
  },
  machine: {
    energy: 'reactor', food: null, house: null, prod: ['drill', 'nexus'], defense: ['turret', 'shield'],
    steps: [['reactor', 2], ['drill', 2], ['reactor', 3], ['drill', 3], ['lab', 1], ['reactor', 4], ['drill', 4], ['lab', 2], ['yard', 1], ['nexus', 1], ['reactor', 5], ['drill', 5], ['turret', 1], ['store', 1], ['yard', 2], ['turret', 2], ['shield', 1]],
    techs: ['quantique', 'ions', 'supra', 'ions', 'replication', 'essaim', 'quantique', 'coque', 'coque', 'essaim', 'supra', 'quantique', 'coque', 'essaim'],
  },
  alien: {
    energy: 'prism', food: 'hive', house: 'sanctuary', prod: ['amplifier'], defense: ['spines', 'dome'],
    steps: [['hive', 2], ['prism', 2], ['sanctuary', 1], ['hive', 3], ['prism', 3], ['lab', 1], ['sanctuary', 2], ['amplifier', 1], ['lab', 2], ['yard', 1], ['hive', 4], ['prism', 4], ['spines', 1], ['store', 1], ['sanctuary', 3], ['yard', 2], ['dome', 1]],
    techs: ['echo', 'levitation', 'levitation', 'ponte', 'symbiose', 'dard', 'echo', 'carapace', 'carapace', 'dard', 'echo', 'carapace', 'dard', 'symbiose'],
  },
};

/** Planètes que l'IA cherche à tenir en même temps (mère comprise). */
const WANT_PLANETS = 4;
/** Pas de conquête avant ce délai après le départ : le temps de s'installer et de se défendre. */
export const PEACE_MS = 10 * MIN;

const copy = (x) => JSON.parse(JSON.stringify(x));

/**
 * Un passage de réflexion de l'IA `s` (une Session). Donne au plus `budget` ordres, chacun
 * vérifié d'avance. Renvoie le nombre d'ordres donnés.
 */
export function think(s, budget = BUDGET) {
  if (!s.state || s.status !== 'playing') return 0;
  const p = s.state.players[s.me];
  if (!p) return 0;
  const ctx = { s, p, now: s.now(), left: budget, done: 0 };
  const order = (fn) => {
    if (ctx.left <= 0) return false;
    ctx.left--;
    ctx.done++;
    return fn() !== false;
  };
  ctx.order = order;
  if (!p.race) {
    order(() => s.chooseRace(pickRace(s)));
    return ctx.done;
  }
  if (!s.canAct) return ctx.done;
  if (!Number.isFinite(p.ready) && !p.home && !Number.isFinite(p.since)) {
    order(() => s.ready());
    return ctx.done;
  }
  // Sans planète mère : envoyer le colonisateur de départ (ou celui qui a trouvé la place prise).
  // Un colonisateur adverse arrivera avant lui (D-490) : il change de cap tout de suite.
  if (!p.home) {
    for (const f of p.fleets || []) {
      if (f.ships.colony && !f.order && !moving(f, ctx.now)) sendColonizer(ctx, f, true);
      else if (f.ships.colony && beaten(ctx, f)) sendColonizer(ctx, f, true);
    }
    return ctx.done;
  }
  const mine = s.planetsOf(p).filter((pl) => s.frostOf(pl.cell) > ctx.now);
  for (const pl of mine) {
    if (ctx.left <= 0) break;
    const st = stateAt(pl.planet, ctx.now);
    evacuate(ctx, pl, st);
    planBuilding(ctx, pl, st);
    planResearch(ctx, pl, st);
    planShips(ctx, pl, st);
    usePowers(ctx, pl, st);
    launchColonizer(ctx, pl, st);
  }
  for (const f of [...(p.fleets || [])]) {
    if (ctx.left <= 0) break;
    steerFleet(ctx, f);
  }
  if (ctx.left > 0) attack(ctx, mine);
  return ctx.done;
}

/** Race la moins prise par les autres (au hasard entre les ex æquo). */
function pickRace(s) {
  const taken = s.roster.filter((o) => o.id !== s.me).map((o) => o.race);
  const keys = Object.keys(RACES);
  const fewest = Math.min(...keys.map((k) => taken.filter((r) => r === k).length));
  const pool = keys.filter((k) => taken.filter((r) => r === k).length === fewest);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ----- planètes ---------------------------------------------------------------

/** Places encore libres une fois le chantier et le fil terminés. */
const freePlaces = (planet, st) => (Number.isFinite(planet.places) ? planet.places - usedPlaces(st.levels) - (st.queue && !st.queue.demolish ? 1 : 0) - st.plan.filter((x) => typeof x === 'string').length : Infinity);

/**
 * Prochain bâtiment pour cette planète, ou null. D'abord ce qui manque pour vivre (énergie,
 * nourriture, logement), puis les étapes de la race, puis production et défense à tour de rôle.
 * Un bâtiment trop cher pour l'entrepôt fait d'abord monter l'entrepôt. Sur la planète mère
 * (`home`), les dernières places libres vont au labo (niv. 2) et au chantier naval : sans eux,
 * ni colonies ni vaisseaux de guerre.
 */
export function chooseBuilding(race, st, free = Infinity, home = true) {
  const B = PLAYBOOK[race];
  const lv = (k) => (st.levels[k] || 0) + (st.queue?.key === k && !st.queue.demolish ? 1 : 0);
  const f = st.prod;
  const pick = (key) => {
    const cost = upgradeCost(race, key, lv(key));
    // L'entrepôt doit pouvoir contenir le prix (avec un peu de marge).
    if (Object.entries(cost).some(([r, v]) => v > 0.95 * (f.caps[r] ?? Infinity))) return 'store';
    return key;
  };
  const musts = home ? [['lab', 2], ['yard', 1]].filter(([k, n]) => lv(k) < n) : [];
  if (musts.length && free <= musts.reduce((t, [k, n]) => t + n - lv(k), 0)) return pick(musts[0][0]);
  // Énergie : la demande doit être couverte avec une marge, pour le prochain bâtiment.
  if (f.effE < 1 || f.net.energy < 0.12 * f.out.energy + 1) return pick(B.energy);
  if (B.food && (f.effF < 1 || f.net.food < 0.08 * f.out.food + 0.5)) return pick(B.food);
  if (race === 'human' && st.pop > 0.85 * f.popCap) return pick(B.house);
  // Humains : une mine de plus sans bras pour y travailler ne produit rien (la population
  // grandit jusqu'au plafond des habitats : c'est lui qu'on compare).
  const idle = (key) => race === 'human' && key === 'mine' && f.jobs + 10 > 0.9 * f.popCap;
  for (const [key, level] of B.steps) if (lv(key) < level && !idle(key)) return pick(key);
  // Au-delà : la production, puis une défense, en gardant les niveaux proches.
  const pool = [...B.prod, ...B.defense, B.energy].filter((k) => !idle(k));
  if (B.house) pool.push(B.house);
  pool.sort((a, b) => lv(a) - lv(b) || pool.indexOf(a) - pool.indexOf(b));
  return pick(pool[0]);
}

/**
 * Ajoute un bâtiment au fil de construction, quand le fil n'en tient pas déjà un (recherches et
 * vaisseaux au fil ne l'empêchent pas, D-421).
 */
function planBuilding(ctx, pl, st) {
  if (ctx.left <= 0 || st.plan.length >= PLAN_MAX || st.plan.some((x) => typeof x === 'string')) return;
  const free = freePlaces(pl.planet, st);
  if (free <= 0) return;
  // Planète que le froid prendra bientôt : on n'y investit plus.
  if (ctx.s.frostOf(pl.cell) - ctx.now < 2 * MIN) return;
  const key = chooseBuilding(ctx.p.race, st, free, pl.key === 'home');
  if (key) ctx.order(() => ctx.s.planBuild(key, pl.key));
}

/**
 * Prochaine technologie voulue que ce labo peut chercher maintenant (ou null : on attend). Une
 * recherche en cours ou au fil, ici ou sur une autre planète, ne se demande pas deux fois (D-421).
 */
function chooseTech(ctx, pl, st) {
  const race = ctx.p.race;
  const tech = st.tech || {};
  const lab = st.levels.lab || 0;
  if (!lab || st.research) return null;
  const busy = new Set();
  for (const x of ctx.s.planetsOf(ctx.p)) {
    if (x.planet.research) busy.add(x.planet.research.key);
    for (const it of x.planet.plan || []) if (it?.tech) busy.add(it.tech);
  }
  const want = {};
  for (const key of PLAYBOOK[race].techs) {
    want[key] = (want[key] || 0) + 1;
    if ((tech[key] || 0) >= want[key] || busy.has(key)) continue;
    const T = TECHS[race][key];
    if ((tech[key] || 0) >= T.max) continue;
    // Il manque un niveau de labo : on passe à la suivante (le labo viendra avec les étapes).
    if ((T.req.lab || 0) > lab) continue;
    if (Object.entries(T.req).some(([k, n]) => k !== 'lab' && (tech[k] || 0) < n)) continue;
    return key;
  }
  return null;
}

/**
 * Labo libre : la recherche voulue part tout de suite si le fil est vide (et qu'on peut la
 * payer). Fil pas vide, elle irait de toute façon à sa fin (D-420) : on l'y met, une seule
 * recherche au fil à la fois, sans dépasser PLAN_MAX (D-421).
 */
function planResearch(ctx, pl, st) {
  if (ctx.left <= 0) return;
  if (st.plan.length && (st.plan.length >= PLAN_MAX || st.plan.some((x) => x?.tech))) return;
  const key = chooseTech(ctx, pl, st);
  if (!key) return;
  if (st.plan.length) return ctx.order(() => ctx.s.planResearch(key, pl.key));
  // Essai sur une copie : l'ordre ne part que s'il passe (prix couvert).
  if (startResearch(copy(pl.planet), key, ctx.now)) return;
  ctx.order(() => ctx.s.research(key, pl.key));
}

/** Colonisateurs (posés, en vol) et planètes : de quoi savoir s'il en faut un autre. */
function colonyCount(ctx) {
  const p = ctx.p;
  // Au fil compris (D-421) : un colonisateur qui attend son tour compte déjà.
  const planned = (x) => (x.planet.plan || []).reduce((t, it) => t + (it?.ship === 'colony' ? it.n : 0), 0);
  const docked = ctx.s.planetsOf(p).reduce((t, x) => t + (x.planet.ships?.colony || 0) + (x.planet.yard?.type === 'colony' ? x.planet.yard.count : 0) + planned(x), 0);
  const flying = (p.fleets || []).reduce((t, f) => t + (f.ships.colony || 0), 0);
  return ctx.s.planetsOf(p).length + docked + flying;
}

/**
 * Chantier naval libre : un colonisateur s'il manque des planètes, sinon des vaisseaux de guerre.
 * Fil pas vide, le lot va à sa fin (D-420) : un seul lot au fil à la fois, sans dépasser
 * PLAN_MAX (D-421).
 */
function planShips(ctx, pl, st) {
  if (ctx.left <= 0 || !(st.levels.yard > 0) || st.yard) return;
  if (st.plan.length && (st.plan.length >= PLAN_MAX || st.plan.some((x) => x?.ship))) return;
  const race = ctx.p.race;
  const tech = st.tech || {};
  const late = ctx.s.frostOf(pl.cell) - ctx.now < 3 * MIN;
  let type = null;
  let count = 0;
  if (!late && shipUnlocked(race, 'colony', tech) && colonyCount(ctx) < WANT_PLANETS && colonyTargets(ctx, pl.cell).length) {
    type = 'colony';
    count = 1;
  } else {
    const war = ['heavy', 'fighter'].filter((k) => shipUnlocked(race, k, tech));
    if (!war.length) return;
    // On garde de quoi construire : on ne dépense que ce qui dépasse une réserve.
    const reserve = { minerals: 250, food: race === 'human' ? 0 : 120, energy: 150 };
    for (const k of war) {
      const c = SHIPS[race][k].cost;
      let n = 50;
      for (const [r, v] of Object.entries(c)) if (v > 0) n = Math.min(n, Math.floor(((st.stock[r] || 0) - (reserve[r] || 0)) / v));
      if (n >= (k === 'heavy' ? 1 : 2)) {
        type = k;
        count = Math.min(n, k === 'heavy' ? 4 : 8);
        break;
      }
    }
  }
  if (!type) return;
  if (st.plan.length) {
    // Recherche au fil comprise : le vaisseau doit être ouvert à son tour (sinon refus).
    if (!shipUnlocked(race, type, planAhead(st).tech)) return;
    return ctx.order(() => ctx.s.planShips(type, count, pl.key));
  }
  if (startShips(copy(pl.planet), type, count, ctx.now)) return;
  ctx.order(() => ctx.s.buildShips(type, count, pl.key));
}

/** Pouvoirs des aliens : arrachement et transe, dès qu'ils sont prêts et utiles. */
function usePowers(ctx, pl, st) {
  if (ctx.p.race !== 'alien' || ctx.left <= 0) return;
  for (const key of Object.keys(POWERS)) {
    if (ctx.left <= 0) return;
    if (powerReadyAt(pl.planet, key) > ctx.now) continue;
    const cost = powerCost(pl.planet, key, st.pop);
    // On garde l'énergie qui nourrit la population.
    if ((st.stock.energy || 0) < cost.energy + 60) continue;
    if (key === 'lift' && liftGain({ ...pl.planet, stock: st.stock, reserve: st.reserve || pl.planet.reserve, pop: st.pop, levels: st.levels }) < 40) continue;
    if (key === 'trance' && pl.planet.nature?.minerals && (st.reserve?.minerals || 0) < 1) continue;
    ctx.order(() => ctx.s.power(key, pl.key));
  }
}

/** Le froid est presque là : les vaisseaux posés partent se poser sur la planète qui tiendra le plus longtemps. */
function evacuate(ctx, pl, st) {
  if (ctx.left <= 1 || ctx.s.frostOf(pl.cell) - ctx.now > 40_000) return;
  const ships = Object.fromEntries(Object.entries(st.ships || {}).filter(([, n]) => n > 0));
  if (!countShips(ships) || (ctx.p.fleets || []).length >= MAX_FLEETS) return;
  const safe = ctx.s.planetsOf(ctx.p).filter((x) => x.key !== pl.key).sort((a, b) => ctx.s.frostOf(b.cell) - ctx.s.frostOf(a.cell))[0];
  if (!safe || ctx.s.frostOf(safe.cell) <= ctx.s.frostOf(pl.cell)) return;
  const fuel = Math.min(fleetTank(ctx.p.race, ships), Math.floor(st.stock.energy || 0));
  let id = null;
  ctx.order(() => (id = ctx.s.takeOff(pl.key, ships, {}, fuel)));
  if (id) ctx.order(() => ctx.s.moveFleet(id, safe.cell, 'dock'));
}

// ----- colonisation -----------------------------------------------------------------

/**
 * Planètes libres qu'un colonisateur parti de `from` peut prendre : pas encore à quelqu'un,
 * pas visées par un autre de mes colonisateurs, ni par un colonisateur adverse qui y arrivera
 * avant celui-ci (D-490), et qui ne gèleront pas avant longtemps. Les meilleures d'abord :
 * celles que le froid prendra le plus tard (près du soleil), sans aller trop loin. `home` :
 * planète mère, seulement une vraie planète. `ships` : la flotte qui part (sa vitesse).
 */
function colonyTargets(ctx, from, home = false, ships = { colony: 1 }) {
  const { s, p, now } = ctx;
  const aimed = new Set((p.fleets || []).filter((f) => f.order?.kind === 'colonize').map((f) => f.order.world));
  const rivals = rivalColonizers(ctx);
  const speed = fleetSpeed(p.race, ships, p.planet?.tech || {});
  return s.planets
    .filter((w) => (!home || !w.kind || w.kind === 'planet') && !aimed.has(w.id) && !s.ownerAt(w) && s.frostOf(w) - now > 4 * MIN)
    .filter((w) => !ahead(rivals.get(w.id), now + tripMs(from, w, speed), p.id))
    .map((w) => ({ w, score: Math.min(s.frostOf(w) - now, 60 * MIN) / MIN - 0.6 * distance(from, w) + (w.places || 0) / 4 }))
    .sort((a, b) => b.score - a.score || (a.w.id < b.w.id ? -1 : 1))
    .map((x) => x.w);
}

/**
 * Colonisateurs adverses en route, par planète visée : le premier arrivé de chaque planète
 * ({ arrive, pid }). L'IA voit toutes les flottes de la partie (D-152), comme leur ordre.
 */
function rivalColonizers(ctx) {
  const { s, p, now } = ctx;
  const out = new Map();
  for (const o of Object.values(s.state.players)) {
    if (o.id === p.id) continue;
    for (const f of o.fleets || []) {
      if (f.order?.kind !== 'colonize' || !moving(f, now)) continue;
      const r = out.get(f.order.world);
      if (!r || f.arrive < r.arrive || (f.arrive === r.arrive && o.id < r.pid)) out.set(f.order.world, { arrive: f.arrive, pid: o.id });
    }
  }
  return out;
}

/**
 * Le rival `r` arrive-t-il avant moi (`arrive`, joueur `me`) ? À la même milliseconde, le plus
 * petit identifiant passe : deux IA symétriques ne s'écartent pas toutes les deux (D-490).
 */
const ahead = (r, arrive, me) => !!r && (r.arrive < arrive || (r.arrive === arrive && r.pid < me));

/** Mon colonisateur en route sera-t-il devancé sur sa planète par un colonisateur adverse ? */
function beaten(ctx, f) {
  if (f.order?.kind !== 'colonize' || !moving(f, ctx.now) || ctx.s.locked(f.id)) return false;
  return ahead(rivalColonizers(ctx).get(f.order.world), f.arrive, ctx.p.id);
}

/**
 * Envoie une flotte qui porte un colonisateur vers la meilleure planète libre, depuis là où
 * elle est (en route : elle change de cap).
 */
function sendColonizer(ctx, f, home = false) {
  const at = fleetPos(f, ctx.now);
  const pos = { x: Math.round(at.x), y: Math.round(at.y) };
  for (const w of colonyTargets(ctx, pos, home, f.ships).slice(0, 3)) {
    if (fleetBurn(ctx.p.race, f.ships) * distance(at, w) > fuelAt(f, ctx.p.race, ctx.now) + 1e-9) continue;
    return ctx.order(() => ctx.s.moveFleet(f.id, { x: w.x, y: w.y }, 'colonize'));
  }
  return false;
}

/** Un colonisateur posé sur une planète : il décolle avec une cargaison de départ, puis part. */
function launchColonizer(ctx, pl, st) {
  if (ctx.left < 2 || !(st.ships?.colony > 0) || (ctx.p.fleets || []).length >= MAX_FLEETS) return;
  const race = ctx.p.race;
  const target = colonyTargets(ctx, pl.cell)[0];
  if (!target) return;
  const ships = { colony: 1 };
  const fuel = Math.min(fleetTank(race, ships), Math.ceil(fleetBurn(race, ships) * distance(pl.cell, target) * 1.1) + 2, Math.floor(st.stock.energy || 0));
  if (fleetBurn(race, ships) * distance(pl.cell, target) > fuel) return;
  // De quoi lancer les premiers chantiers de la colonie, sans vider la planète.
  const room = SHIPS[race].colony.cargo;
  const minerals = Math.max(0, Math.min(room, Math.floor((st.stock.minerals || 0) / 3)));
  const food = race === 'machine' ? 0 : Math.max(0, Math.min(room - minerals, Math.floor((st.stock.food || 0) / 4)));
  let id = null;
  ctx.order(() => (id = ctx.s.takeOff(pl.key, ships, { minerals, food }, fuel)));
  if (id) ctx.order(() => ctx.s.moveFleet(id, { x: target.x, y: target.y }, 'colonize'));
}

// ----- flottes et combat ------------------------------------------------------------

/** Flotte arrêtée sans ordre : un colonisateur repart chercher une place, les autres rentrent se poser. */
function steerFleet(ctx, f) {
  const { s, p, now } = ctx;
  if (f.ships.colony && beaten(ctx, f)) {
    sendColonizer(ctx, f);
    return;
  }
  if (f.order || moving(f, now) || s.locked(f.id)) return;
  if (f.ships.colony) {
    if (!sendColonizer(ctx, f)) dockNearest(ctx, f);
    return;
  }
  dockNearest(ctx, f);
}

/** Se poser sur la plus proche de mes planètes que le froid ne prend pas tout de suite. */
function dockNearest(ctx, f) {
  const { s, p, now } = ctx;
  const pos = { x: Math.round(f.to.x), y: Math.round(f.to.y) };
  const fuel = fuelAt(f, p.race, now);
  const spot = s
    .planetsOf(p)
    .filter((x) => s.frostOf(x.cell) - now > MIN && fleetBurn(p.race, f.ships) * distance(pos, x.cell) <= fuel + 1e-9)
    .sort((a, b) => distance(pos, a.cell) - distance(pos, b.cell))[0];
  if (spot) ctx.order(() => s.moveFleet(f.id, spot.cell, 'dock'));
}

/**
 * Attaque : quand les vaisseaux de guerre posés sur une de mes planètes battent à coup sûr la
 * défense d'une planète adverse (calcul du combat avec ce que le jeu en montre), ils décollent
 * et partent la conquérir. Sans cible à leur portée, ils restent posés et défendent. Une
 * planète déjà visée par une de mes flottes de conquête ne l'est pas une 2e fois : les
 * vaisseaux partent la rejoindre (`joinFleet`), ou visent une autre planète (D-280).
 */
function attack(ctx, mine) {
  const { s, p, now } = ctx;
  if ((p.fleets || []).length >= MAX_FLEETS || !(now - s.startedAt >= PEACE_MS)) return;
  const targets = [];
  for (const o of Object.values(s.state.players)) {
    if (o.id === p.id || !o.race) continue;
    for (const pl of s.livePlanets(o, now)) {
      const st = stateAt(pl.planet, now);
      targets.push({ o, pl, st, fort: fortOf(o.race, st.levels, st.pop) });
    }
  }
  if (!targets.length) return;
  const aimed = aimedTargets(p);
  for (const base of mine) {
    if (ctx.left < 2) return;
    const st = stateAt(base.planet, now);
    const ships = Object.fromEntries(Object.entries(st.ships || {}).filter(([k, n]) => n > 0 && k !== 'colony' && k !== 'cargo'));
    if (!countShips(ships) || !armed(p.race, ships, st.tech)) continue;
    const speed = fleetSpeed(p.race, ships, st.tech);
    const tank = fleetTank(p.race, ships);
    const burn = fleetBurn(p.race, ships);
    const options = targets
      .map((t) => {
        const d = distance(base.cell, t.pl.cell);
        const arrive = now + tripMs(base.cell, t.pl.cell, speed);
        return { ...t, d, arrive };
      })
      // Assez de carburant pour l'aller, de l'énergie pour faire le plein, et la cible tiendra jusqu'à l'arrivée.
      .filter((t) => burn * t.d <= Math.min(tank, Math.floor(st.stock.energy || 0)) && s.frostOf(t.pl.cell) > t.arrive + MIN)
      .map((t) => {
        const res = battle({ race: p.race, ships, tech: st.tech }, { race: t.o.race, ships: t.st.ships || {}, tech: t.st.tech, fort: t.fort });
        // Une victoire nette : il reste au moins la moitié de la flotte (la cible peut se renforcer en route).
        const kept = countShips(res.attLeft) / countShips(ships);
        return { ...t, won: res.won && kept >= 0.5, kept };
      })
      .filter((t) => t.won)
      // Les planètes qui tiendront le plus longtemps d'abord, puis les plus proches.
      .sort((a, b) => s.frostOf(b.pl.cell) - s.frostOf(a.pl.cell) - (b.d - a.d) * 20_000);
    for (const t of options) {
      // Déjà visée par une de mes flottes de conquête (D-280) : jamais une 2e conquête, ces
      // vaisseaux la rejoignent en renfort, ou bien visent la cible suivante.
      const g = aimed.get(`${t.o.id}:${t.pl.key}`);
      if (g && !canJoin(ctx, base, g, { speed, tank, burn, energy: st.stock.energy })) continue;
      const d = g ? distance(base.cell, g.to) : t.d;
      const fuel = Math.min(tank, Math.floor(st.stock.energy || 0), Math.ceil(burn * d * 2) + 2);
      let id = null;
      ctx.order(() => (id = s.takeOff(base.key, ships, {}, fuel)));
      if (!id) break;
      if (g) ctx.order(() => s.joinFleet(id, g.id));
      else ctx.order(() => s.moveFleet(id, { ...t.pl.cell }, 'conquer'));
      return;
    }
  }
}

/** Mes flottes de conquête en route, par cible (« pid:clé »). */
function aimedTargets(p) {
  const aimed = new Map();
  for (const f of p.fleets || []) if (f.order?.kind === 'conquer') aimed.set(`${f.order.pid}:${f.order.key}`, f);
  return aimed;
}

/**
 * Des vaisseaux partis de `base` peuvent rejoindre la flotte de conquête `g` : assez de
 * carburant, et ils arrivent après elle. Arrivés avant, la fusion effacerait son ordre de
 * conquête (merge) : la planète ne serait plus attaquée.
 */
function canJoin(ctx, base, g, { speed, tank, burn, energy }) {
  if (ctx.s.locked(g.id)) return false;
  const d = distance(base.cell, g.to);
  return burn * d <= Math.min(tank, Math.floor(energy || 0)) && ctx.now + tripMs(base.cell, g.to, speed) >= g.arrive;
}

// ----- l'IA sur le téléphone de l'hôte ---------------------------------------------------

/**
 * Deux bouts d'un lien en mémoire, avec l'interface d'un lien WebRTC (send, onmessage,
 * onclose, close, route, closed). Chaque message est recopié à l'envoi, comme sur le réseau
 * (JSON), sauf le journal des ordres d'une fiche, dont les entrées sont partagées et gelées
 * (copyRec, D-370) ; il arrive un peu après (jamais pendant l'ordre qui l'envoie).
 */
const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/** Gèle un objet et tout ce qu'il contient (une entrée du journal des ordres). */
function deepFreeze(x) {
  if (!x || typeof x !== 'object' || Object.isFrozen(x)) return x;
  for (const v of Object.values(x)) deepFreeze(v);
  return Object.freeze(x);
}

/**
 * Copie d'une fiche pour une autre Session du même téléphone (D-370) : tout est recopié comme
 * par le réseau (JSON), sauf les entrées du journal des ordres, partagées. Une entrée ne change
 * plus une fois l'ordre fini : elle est gelée, et aucune Session ne peut la modifier chez une
 * autre (une tentative lève une erreur). La dernière entrée peut être celle de l'ordre en cours
 * de l'expéditeur (encore modifiable) : elle est recopiée. Le journal fait jusqu'à 1 500
 * entrées, la fiche sans lui quelques Ko : c'était l'essentiel du travail (issue #39).
 * Règle dont dépend le gel : l'entrée de l'ordre en cours (`entry`, la seule qu'on modifie) est
 * toujours la dernière du journal de son joueur (touch l'ajoute une fois, à la fin). Si cela
 * change, une écriture dans une entrée gelée lèvera une erreur (modules en mode strict) : on le
 * verra tout de suite, rien ne sera corrompu en silence.
 */
/** `fullCopy` : tout recopier en JSON, comme avant D-370 (tests : la partie doit être la même). */
export const LINK = { fullCopy: false };

export function copyRec(rec) {
  const orders = rec.orders;
  if (!Array.isArray(orders)) return JSON.parse(JSON.stringify(rec));
  // Le journal reste à sa place parmi les clés : la fiche est la même, au caractère près.
  const out = JSON.parse(JSON.stringify({ ...rec, orders: [] }));
  const n = orders.length;
  const list = new Array(n);
  for (let i = 0; i < n - 1; i++) list[i] = deepFreeze(orders[i]);
  if (n) list[n - 1] = deepFreeze(JSON.parse(JSON.stringify(orders[n - 1] ?? null)));
  out.orders = list;
  return out;
}

export function localPair() {
  const a = new LocalLink();
  const b = new LocalLink();
  a.peer = b;
  b.peer = a;
  return [a, b];
}

class LocalLink {
  constructor() {
    this.peer = null;
    this.closed = false;
    this.viaRoom = false;
    // Même téléphone : même horloge (D-165), et le silence ne veut rien dire, la page était
    // seulement en pause (D-220).
    this.local = true;
    this.queue = [];
    this.handler = null;
    this.closer = null;
  }
  set onmessage(fn) {
    this.handler = fn;
    const q = this.queue;
    this.queue = [];
    if (fn) for (const m of q) fn(m);
  }
  get onmessage() {
    return this.handler;
  }
  /** La fiche livrée est déjà une copie à moi (copyRec) : `onRecord` ne la recopie pas (D-370). */
  get copied() {
    return !LINK.fullCopy;
  }
  set onclose(fn) {
    this.closer = fn;
  }
  get onclose() {
    return this.closer;
  }
  send(msg) {
    if (this.closed) return;
    // Copie faite à l'envoi : la fiche de l'expéditeur peut encore changer avant la livraison.
    let data;
    if (msg?.type === 'rec' && isObj(msg.rec) && !LINK.fullCopy) {
      const { rec, ...rest } = msg;
      data = { ...JSON.parse(JSON.stringify(rest)), rec: copyRec(rec) };
    } else data = JSON.parse(JSON.stringify(msg));
    const peer = this.peer;
    queueMicrotask(() => peer.receive(data));
  }
  receive(msg) {
    if (this.closed) return;
    if (this.handler) this.handler(msg);
    else this.queue.push(msg);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    const fn = this.closer;
    this.closer = null;
    fn?.();
    this.peer?.close();
  }
  route() {
    return Promise.resolve('bot');
  }
}

function newPid() {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

/**
 * Session de l'IA `pid`, sur une copie de la partie de l'hôte, reliée à lui. Elle ne sauve
 * rien (l'hôte sauve toute la partie, fiche de l'IA comprise) et n'appelle personne.
 */
function botSession(host, pid, timers, clock) {
  const p = host.state.players[pid];
  const bot = new Session(p.name);
  Object.assign(bot, {
    me: pid,
    state: copy(host.snapshot()),
    status: 'playing',
    isBot: true,
    save() {},
    scheduleSave() {},
    meet() {},
    async dial() {},
    start() {},
  });
  bot.state.log = [...host.state.log];
  // Même téléphone : l'heure commune de l'hôte (D-165).
  Object.assign(bot, { clock: () => host.clock(), clockSynced: true });
  // Horloge de test : l'heure reste figée pendant un ordre, comme Session.now.
  if (clock) bot.now = () => bot.entry?.t ?? clock();
  const [h, b] = localPair();
  host.attach(h, pid);
  bot.attach(b, host.me);
  bot.end = () => {
    bot.timers.forEach(clearInterval);
    bot.timers = [];
    bot.status = 'idle';
    b.close();
  };
  if (timers) {
    let n = 0;
    const every = Math.max(1, Math.round(THINK_MS / 1000));
    bot.timers.push(
      setInterval(() => {
        if (bot.status !== 'playing') return;
        bot.tick();
        bot.checkStart();
        if (++n % every === 0) think(bot);
      }, 1000),
    );
  }
  (host.bots ||= new Map()).set(pid, bot);
  return bot;
}

/**
 * Ajoute une IA à la partie de `host` (le téléphone qui la fera jouer) : un nouveau joueur,
 * comme un invité accueilli, qui choisit sa race et se dit prêt aussitôt. Renvoie sa Session,
 * ou null si la partie est complète. `timers: false` : rien ne tourne seul ; `clock` : l'heure
 * de l'IA (tests).
 */
export function addBot(host, { race = null, name = null, timers = true, clock = null } = {}) {
  const st = host.state;
  if (!st || host.roster.length >= 8) return null;
  const used = new Set(Object.values(st.players).map((o) => o.name));
  name ||= NAMES.find((n) => !used.has(n)) || `IA ${Object.keys(st.players).length + 1}`;
  const pid = newPid();
  // Personne ne revient jamais avec son secret : n'importe quelle empreinte fait l'affaire.
  host.addPlayer(pid, name, newPid().padEnd(64, '0'));
  const log = host.addLog(`${name} (IA) rejoint la partie, sur le téléphone de ${host.state.players[host.me]?.name || host.name}.`);
  host.spread(host.state.players[pid], log);
  host.botIds = [...(host.botIds || []), pid];
  const bot = botSession(host, pid, timers, clock);
  if (race && RACES[race]) bot.chooseRace(race);
  think(bot);
  think(bot);
  host.changed();
  return bot;
}

/**
 * L'IA `pid` que ce téléphone fait jouer, si l'hôte peut encore la modifier : seulement avant
 * le départ (D-399, D-400). Sinon null.
 */
export function editableBot(host, pid) {
  const bot = host.bots?.get(pid);
  if (!bot || host.startedAt != null || !host.state?.players[pid] || Number.isFinite(host.state.players[pid].left)) return null;
  return bot;
}

/**
 * Retire du lobby l'IA `pid` (D-399) : elle quitte la partie (sa fiche, marquée `left`,
 * part chez tous comme ses autres changements), puis s'arrête. Renvoie true si c'est fait.
 */
export function removeBot(host, pid) {
  const bot = editableBot(host, pid);
  if (!bot || !bot.leave()) return false;
  // Sa fiche rejoint l'hôte tout de suite, par le même chemin qu'un message (le lien en
  // mémoire se ferme juste après, le message en route serait perdu).
  const link = host.links.get(pid);
  const log = bot.state.log.at(-1);
  if (link) host.onRecord(link, copy(bot.state.players[pid]), log);
  bot.end();
  host.bots.delete(pid);
  host.botIds = (host.botIds || []).filter((x) => x !== pid);
  host.changed();
  return true;
}

/** Renomme l'IA `pid` (D-400). Un nom vide est refusé (elle garde l'ancien). */
export function renameBot(host, pid, name) {
  const bot = editableBot(host, pid);
  return !!bot && bot.rename(name);
}

/** Change la race de l'IA `pid` (D-400), avant le départ. */
export function setBotRace(host, pid, race) {
  const bot = editableBot(host, pid);
  return !!bot && bot.chooseRace(race);
}

/** Reprise d'une partie : les IA que ce téléphone faisait jouer se remettent à jouer. */
export function wakeBots(host, { timers = true, clock = null } = {}) {
  const out = [];
  for (const pid of host.botIds || []) {
    if (!host.state?.players[pid] || host.bots?.has(pid)) continue;
    const bot = botSession(host, pid, timers, clock);
    bot.tick();
    out.push(bot);
  }
  return out;
}
