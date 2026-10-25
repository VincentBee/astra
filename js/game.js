// Règles du jeu : fonctions pures, sans réseau ni DOM.
// Port de game.rs (version serveur), en version accélérée pour des parties courtes.
//
// Principe : pas de tick. Une planète stocke son stock à l'instant `at`
// (heure du MJ, en ms) ; la valeur à tout instant se calcule avec la
// production et le temps écoulé. Le MJ fait foi ; les joueurs refont le
// même calcul pour animer leur écran.

/** Facteur de vitesse : 60 = une « heure » de jeu dure une minute. */
export const SPEED = 60;
export const STORAGE = 10_000;
export const START = { metal: 500, crystal: 500, deuterium: 0 };

export const BUILDINGS = {
  metal_mine: {
    name: 'Mine de métal',
    short: 'Métal',
    start: 1,
    base: { metal: 60, crystal: 15, deuterium: 0 },
    factor: 1.5,
  },
  crystal_mine: {
    name: 'Mine de cristal',
    short: 'Cristal',
    start: 1,
    base: { metal: 48, crystal: 24, deuterium: 0 },
    factor: 1.6,
  },
  deuterium_synthesizer: {
    name: 'Synthétiseur de deutérium',
    short: 'Deutérium',
    start: 0,
    base: { metal: 225, crystal: 75, deuterium: 0 },
    factor: 1.5,
  },
  solar_plant: {
    name: 'Centrale solaire',
    short: 'Énergie',
    start: 1,
    base: { metal: 75, crystal: 30, deuterium: 0 },
    factor: 1.5,
  },
};

export const BUILDING_KEYS = Object.keys(BUILDINGS);
const RES = ['metal', 'crystal', 'deuterium'];
const BASE_INCOME = { metal: 30, crystal: 15, deuterium: 0 };

/** a x L x 1.1^L, arrondi au millionième (évite le bruit des flottants). */
function curve(a, level) {
  return Math.round(a * level * Math.pow(1.1, level) * 1e6) / 1e6;
}

export function newPlanet(now) {
  const levels = {};
  for (const k of BUILDING_KEYS) levels[k] = BUILDINGS[k].start;
  return { stock: { ...START }, at: now, levels, queue: null };
}

/** Production par heure de jeu, et rendement selon l'énergie. */
export function production(levels) {
  const energyProduced = Math.floor(curve(20, levels.solar_plant));
  const energyNeeded = Math.ceil(
    curve(10, levels.metal_mine) +
      curve(10, levels.crystal_mine) +
      curve(20, levels.deuterium_synthesizer),
  );
  const efficiency = energyNeeded <= 0 ? 1 : Math.min(1, Math.max(0, energyProduced / energyNeeded));
  return {
    perHour: {
      metal: BASE_INCOME.metal + curve(30, levels.metal_mine) * efficiency,
      crystal: BASE_INCOME.crystal + curve(20, levels.crystal_mine) * efficiency,
      deuterium: BASE_INCOME.deuterium + curve(10, levels.deuterium_synthesizer) * efficiency,
    },
    energyProduced,
    energyNeeded,
    efficiency,
  };
}

/** Fait avancer un stock de `ms` millisecondes réelles. */
export function accrue(stock, perHour, ms) {
  const hours = (Math.max(0, ms) / 3_600_000) * SPEED;
  const out = {};
  for (const r of RES) {
    out[r] = stock[r] >= STORAGE ? stock[r] : Math.min(STORAGE, stock[r] + perHour[r] * hours);
  }
  return out;
}

export function upgradeCost(key, level) {
  const b = BUILDINGS[key];
  const m = Math.pow(b.factor, level);
  return {
    metal: Math.floor(b.base.metal * m),
    crystal: Math.floor(b.base.crystal * m),
    deuterium: Math.floor(b.base.deuterium * m),
  };
}

/** Durée de construction en ms (accélérée). */
export function buildDuration(cost) {
  return Math.max(4, Math.round((cost.metal + cost.crystal) / 25)) * 1000;
}

export function covers(stock, cost) {
  return RES.every((r) => stock[r] + 1e-9 >= cost[r]);
}

/**
 * État d'une planète à l'instant `now`, sans la modifier.
 * Applique une construction terminée entre-temps : production à l'ancien
 * niveau jusqu'à la fin du chantier, puis au nouveau niveau.
 */
export function stateAt(planet, now) {
  let stock = planet.stock;
  let at = planet.at;
  let levels = planet.levels;
  let queue = planet.queue;
  if (queue && queue.end <= now) {
    stock = accrue(stock, production(levels).perHour, queue.end - at);
    at = queue.end;
    levels = { ...levels, [queue.key]: queue.level };
    queue = null;
  }
  const prod = production(levels);
  return { stock: accrue(stock, prod.perHour, now - at), levels, queue, prod };
}

/** Version « solde » : écrit l'état courant dans la planète (MJ uniquement). */
export function settle(planet, now) {
  const s = stateAt(planet, now);
  const finished = planet.queue && !s.queue ? planet.queue : null;
  planet.stock = s.stock;
  planet.at = now;
  planet.levels = s.levels;
  planet.queue = s.queue;
  return finished;
}

/** Valide et applique un ordre de construction. Renvoie une erreur lisible ou null. */
export function startBuild(planet, key, now) {
  if (!BUILDINGS[key]) return 'Bâtiment inconnu.';
  settle(planet, now);
  if (planet.queue) return 'Un chantier est déjà en cours.';
  const level = planet.levels[key];
  const cost = upgradeCost(key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  for (const r of RES) planet.stock[r] -= cost[r];
  planet.queue = { key, level: level + 1, start: now, end: now + buildDuration(cost) };
  return null;
}

/** Score simple pour le classement : ressources investies dans les bâtiments. */
export function score(levels) {
  let total = 0;
  for (const k of BUILDING_KEYS) {
    for (let l = 0; l < levels[k]; l++) {
      const c = upgradeCost(k, l);
      total += c.metal + c.crystal + c.deuterium;
    }
  }
  return Math.floor(total / 100);
}

export function fmt(v) {
  return Math.floor(Math.max(0, v)).toLocaleString('fr-FR');
}

// ---------------------------------------------------------------------------
// Univers : grille 2D où chaque commandant déplace son vaisseau
// ---------------------------------------------------------------------------

export const UNIVERSE = { w: 20, h: 20 };
/** Délai minimal entre deux pas d'un même vaisseau (ms). */
export const MOVE_COOLDOWN = 150;
export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const inUniverse = (x, y) => x >= 0 && y >= 0 && x < UNIVERSE.w && y < UNIVERSE.h;

/** Position après un pas ; reste sur place au bord de l'univers. */
export function step(pos, dir) {
  const d = DIRS[dir];
  if (!d) return pos;
  const x = pos.x + d.dx;
  const y = pos.y + d.dy;
  return inUniverse(x, y) ? { x, y } : pos;
}

/** Distance en nombre de pas (sans diagonales). */
export const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Case de départ libre, à au moins `minGap` pas des planètes existantes.
 * `random` est injectable pour les tests.
 */
export function freeCell(taken, random = Math.random, minGap = 4) {
  for (let gap = minGap; gap >= 0; gap--) {
    for (let tries = 0; tries < 200; tries++) {
      const c = { x: 1 + Math.floor(random() * (UNIVERSE.w - 2)), y: 1 + Math.floor(random() * (UNIVERSE.h - 2)) };
      if (taken.every((t) => distance(t, c) >= Math.max(gap, 1))) return c;
    }
  }
  return { x: Math.floor(UNIVERSE.w / 2), y: Math.floor(UNIVERSE.h / 2) };
}
