// Règles du jeu : fonctions pures, sans réseau ni DOM.
// Version accélérée pour des parties courtes : une « heure » de jeu = une minute.
//
// Principe : pas de tick partagé. Une planète stocke son état à l'instant `at`
// (heure du téléphone, en ms) ; l'état à tout instant se calcule à partir du
// temps écoulé. Chaque joueur fait foi pour sa propre planète ; les autres
// refont le même calcul pour l'afficher.
//
// Trois ressources : minéraux (constructions), nourriture (population),
// énergie (bâtiments, et la « population » des machines). Trois races, au
// gameplay différent, choisies une fois pour toutes en arrivant dans la partie.
//
// Comme la population grandit ou meurt de faim selon les stocks, l'économie
// n'a pas de formule fermée : on l'intègre par petits pas (300 au plus par
// calcul, même après une journée d'absence).

/** Facteur de vitesse : 60 = une « heure » de jeu dure une minute. */
export const SPEED = 60;
export const STORAGE = 10_000;
export const RES = ['minerals', 'food', 'energy'];
export const RES_INFO = {
  minerals: { name: 'Minéraux', short: 'min.' },
  food: { name: 'Nourriture', short: 'nourr.' },
  energy: { name: 'Énergie', short: 'én.' },
};

/** a x L x 1.1^L, arrondi au millionième (évite le bruit des flottants). */
function curve(a, level) {
  return Math.round(a * level * Math.pow(1.1, level) * 1e6) / 1e6;
}

const lv = (levels, k) => levels[k] || 0;

// ---------------------------------------------------------------------------
// Races
// ---------------------------------------------------------------------------
//
// Chaque race décrit ses bâtiments et une fonction `rates` qui donne, pour
// des niveaux et une population, ce qui entre et sort par heure de jeu :
//   energyIn / energyOut : production et consommation d'énergie
//   food(effE)           : production de nourriture selon le courant reçu
//   foodOut              : nourriture mangée par la population
//   minerals(effE, effF) : production de minéraux selon courant et nourriture
//   popCap, energyCap    : plafonds
// et une fonction `grow` pour la population.

export const RACES = {
  human: {
    name: 'Humains',
    one: 'Humain',
    icon: '◆',
    color: '#7aa2ff',
    pitch: 'Une population nombreuse qui fait tourner mines et fermes.',
    traits: [
      'La population travaille : sans bras, les mines tournent au ralenti.',
      'Elle grandit tant qu’il y a à manger et de la place dans les habitats.',
      'Famine : la population meurt, et la production s’effondre.',
    ],
    resources: ['minerals', 'food', 'energy'],
    start: { minerals: 500, food: 300, energy: 200 },
    pop: { label: 'Habitants', unit: 'habitant', start: 20, min: 5 },
    power: 1,
    buildings: {
      mine: {
        name: 'Mine',
        short: 'Mine',
        start: 1,
        desc: 'Minéraux, avec des ouvriers (15 par niveau).',
        base: { minerals: 60, energy: 0 },
        factor: 1.5,
      },
      farm: {
        name: 'Ferme hydroponique',
        short: 'Ferme',
        start: 1,
        desc: 'Nourriture. Tourne à moitié sans ouvriers.',
        base: { minerals: 55, energy: 0 },
        factor: 1.5,
      },
      habitat: {
        name: 'Habitat',
        short: 'Habitat',
        start: 1,
        desc: 'Loge plus d’habitants.',
        base: { minerals: 80, energy: 0 },
        factor: 1.6,
      },
      solar: {
        name: 'Centrale solaire',
        short: 'Solaire',
        start: 1,
        desc: 'Énergie pour les bâtiments.',
        base: { minerals: 75, energy: 0 },
        factor: 1.5,
      },
    },
    rates(levels, pop) {
      const jobs = 15 * (lv(levels, 'mine') + lv(levels, 'farm'));
      const work = jobs > 0 ? Math.min(1, pop / jobs) : 1;
      return {
        work,
        energyIn: curve(22, lv(levels, 'solar')),
        energyOut: curve(10, lv(levels, 'mine')) + curve(6, lv(levels, 'farm')) + curve(4, lv(levels, 'habitat')),
        food: (effE) => curve(26, lv(levels, 'farm')) * (0.5 + 0.5 * work) * effE,
        foodOut: 0.5 * pop,
        // Revenu de base + impôt (0,3 minéral par habitant) + mines.
        minerals: (effE) => 30 + 0.3 * pop + curve(30, lv(levels, 'mine')) * work * effE,
        popCap: 50 + curve(40, lv(levels, 'habitat')),
        energyCap: STORAGE,
      };
    },
    /** Croissance logistique si nourris, mort par famine sinon. */
    grow(pop, cap, effF, effE, h) {
      if (effF < 1) return pop * Math.exp(-0.3 * (1 - effF) * h);
      if (pop > cap) return cap + (pop - cap) * Math.exp(-0.2 * h);
      const r = 0.1;
      return cap / (1 + (cap / pop - 1) * Math.exp(-r * h));
    },
  },

  machine: {
    name: 'Machines',
    one: 'Machine',
    icon: '⬢',
    color: '#ffd166',
    pitch: 'Aucune bouche à nourrir : tout tourne à l’énergie.',
    traits: [
      'Pas de population ni de nourriture : seule l’énergie compte.',
      'Les foreuses produisent beaucoup, mais dévorent du courant.',
      'Les constructions coûtent aussi de l’énergie. Les batteries en stockent.',
    ],
    resources: ['minerals', 'energy'],
    start: { minerals: 600, food: 0, energy: 600 },
    pop: null,
    power: 0,
    buildings: {
      drill: {
        name: 'Foreuse automatisée',
        short: 'Foreuse',
        start: 1,
        desc: 'Beaucoup de minéraux, beaucoup d’énergie.',
        base: { minerals: 60, energy: 30 },
        factor: 1.5,
      },
      reactor: {
        name: 'Réacteur à fusion',
        short: 'Réacteur',
        start: 1,
        desc: 'Énergie.',
        base: { minerals: 90, energy: 0 },
        factor: 1.5,
      },
      battery: {
        name: 'Batteries',
        short: 'Batteries',
        start: 1,
        desc: 'Stockent plus d’énergie (+3 000 par niveau).',
        base: { minerals: 70, energy: 40 },
        factor: 1.6,
      },
      nexus: {
        name: 'Nœud de calcul',
        short: 'Calcul',
        start: 0,
        desc: 'Chantiers plus rapides (−13 % de durée par niveau, cumulé).',
        base: { minerals: 150, energy: 150 },
        factor: 1.8,
      },
    },
    rates(levels) {
      return {
        work: 1,
        energyIn: curve(30, lv(levels, 'reactor')),
        energyOut: curve(18, lv(levels, 'drill')) + curve(8, lv(levels, 'nexus')),
        food: () => 0,
        foodOut: 0,
        minerals: (effE) => 20 + curve(38, lv(levels, 'drill')) * effE,
        popCap: 0,
        energyCap: 2000 + 3000 * lv(levels, 'battery'),
      };
    },
    grow: () => 0,
  },

  alien: {
    name: 'Aliens',
    one: 'Alien',
    icon: '✦',
    color: '#d38bff',
    pitch: 'Une poignée de psioniques, chacun plus fort que cent humains.',
    traits: [
      'Très peu nombreux, mais chacun vaut plus de cent humains.',
      'Pas de mines : ils arrachent les minéraux par télékinésie.',
      'Chaque psionique mange de la nourriture et consomme de l’énergie.',
      'Pouvoirs psychiques à déclencher : arrachement, accélération.',
    ],
    resources: ['minerals', 'food', 'energy'],
    start: { minerals: 400, food: 200, energy: 200 },
    pop: { label: 'Psioniques', unit: 'psionique', start: 2, min: 1 },
    power: 120,
    buildings: {
      sanctuary: {
        name: 'Sanctuaire',
        short: 'Sanctuaire',
        start: 1,
        desc: 'Un psionique de plus peut y naître par niveau.',
        base: { minerals: 200, energy: 50 },
        factor: 1.9,
      },
      hive: {
        name: 'Ruche nourricière',
        short: 'Ruche',
        start: 1,
        desc: 'Nourriture.',
        base: { minerals: 60, energy: 0 },
        factor: 1.5,
      },
      prism: {
        name: 'Prisme psionique',
        short: 'Prisme',
        start: 1,
        desc: 'Énergie.',
        base: { minerals: 75, energy: 0 },
        factor: 1.5,
      },
      amplifier: {
        name: 'Amplificateur psychique',
        short: 'Amplificateur',
        start: 0,
        desc: 'Télékinésie et pouvoirs +25 % par niveau.',
        base: { minerals: 150, energy: 100 },
        factor: 1.7,
      },
    },
    rates(levels, pop) {
      const amp = 1 + 0.25 * lv(levels, 'amplifier');
      return {
        work: 1,
        energyIn: curve(25, lv(levels, 'prism')),
        energyOut: 8 * pop + curve(4, lv(levels, 'hive')) + curve(6, lv(levels, 'amplifier')),
        food: (effE) => curve(20, lv(levels, 'hive')) * effE,
        foodOut: 8 * pop,
        // Extraction télékinésique : 30 minéraux par psionique, s'il est nourri et alimenté.
        minerals: (effE, effF) => 20 + 30 * pop * amp * Math.min(effE, effF),
        popCap: 2 + lv(levels, 'sanctuary'),
        energyCap: STORAGE,
      };
    },
    /** Naissances lentes (un psionique toutes les ~16 h de jeu), dépérissement si privés. */
    grow(pop, cap, effF, effE, h) {
      const eff = Math.min(effF, effE);
      if (eff < 1) return pop - 0.15 * (1 - eff) * h;
      if (pop >= cap) return Math.max(cap, pop - 0.1 * h);
      return Math.min(cap, pop + 0.06 * h);
    },
  },
};

export const RACE_KEYS = Object.keys(RACES);

/** Pouvoirs psychiques des aliens. */
export const POWERS = {
  lift: {
    name: 'Arrachement télékinésique',
    desc: 'Arrache d’un coup 100 minéraux par psionique aux astéroïdes voisins.',
    cooldown: 180_000,
    cost: (pop) => ({ minerals: 0, energy: 40 * Math.ceil(pop) }),
  },
  rush: {
    name: 'Accélération psychique',
    desc: 'Termine instantanément le chantier en cours.',
    cooldown: 300_000,
    cost: () => ({ minerals: 0, energy: 150 }),
  },
};
export const POWER_KEYS = Object.keys(POWERS);

export const raceOf = (planet) => RACES[planet?.race] || null;

export function newPlanet(race, now) {
  const R = RACES[race];
  const levels = {};
  for (const [k, b] of Object.entries(R.buildings)) levels[k] = b.start;
  return {
    race,
    stock: { ...R.start },
    pop: R.pop ? R.pop.start : 0,
    at: now,
    levels,
    queue: null,
    powers: {},
  };
}

// ---------------------------------------------------------------------------
// Économie
// ---------------------------------------------------------------------------

/**
 * Flux sur `h` heures de jeu à partir d'un état. Les rendements `effE`
 * (courant) et `effF` (nourriture) valent 1 tant que le stock suffit ; en
 * pénurie, ils valent la part de la demande couverte.
 */
export function flows(race, levels, pop, stock, h) {
  const R = RACES[race];
  const r = R.rates(levels, pop);
  const needE = r.energyOut * h;
  const effE = needE > 0 ? Math.min(1, (stock.energy + r.energyIn * h) / needE) : 1;
  const foodIn = r.food(effE);
  const needF = r.foodOut * h;
  const effF = needF > 0 ? Math.min(1, (stock.food + foodIn * h) / needF) : 1;
  const mineralsIn = r.minerals(effE, effF);
  return {
    effE,
    effF,
    work: r.work,
    popCap: r.popCap,
    energyCap: r.energyCap,
    // Par heure de jeu : production, consommation effective, solde.
    in: { minerals: mineralsIn, food: foodIn, energy: r.energyIn },
    out: { minerals: 0, food: r.foodOut * effF, energy: r.energyOut * effE },
    net: {
      minerals: mineralsIn,
      food: foodIn - r.foodOut * effF,
      energy: r.energyIn - r.energyOut * effE,
    },
  };
}

const capOf = (res, f) => (res === 'energy' ? f.energyCap : STORAGE);

/** Un pas de `ms` millisecondes réelles. */
function advance(race, s, ms) {
  const h = (Math.max(0, ms) / 3_600_000) * SPEED;
  if (h <= 0) return s;
  const f = flows(race, s.levels, s.pop, s.stock, h);
  const stock = {};
  for (const r of RES) {
    const cap = capOf(r, f);
    const v = s.stock[r] + f.net[r] * h;
    // Un entrepôt déjà plein ne déborde pas, mais n'est pas vidé non plus.
    stock[r] = Math.max(0, f.net[r] > 0 ? Math.max(s.stock[r], Math.min(cap, v)) : v);
  }
  const R = RACES[race];
  let pop = s.pop;
  if (R.pop) pop = Math.max(R.pop.min, R.grow(s.pop, f.popCap, f.effF, f.effE, h));
  return { ...s, stock, pop };
}

/** Fait avancer de `from` à `to` (ms), par 300 pas au plus. */
function simulate(race, s, from, to) {
  let t = from;
  const total = to - from;
  if (total <= 0) return s;
  const dt = Math.max(1000, total / 300);
  while (t < to) {
    const ms = Math.min(dt, to - t);
    s = advance(race, s, ms);
    t += ms;
  }
  return s;
}

/**
 * État d'une planète à l'instant `now`, sans la modifier.
 * Applique une construction terminée entre-temps : ancien niveau jusqu'à la
 * fin du chantier, puis nouveau niveau.
 */
export function stateAt(planet, now) {
  const race = planet.race;
  let s = { stock: planet.stock, pop: planet.pop || 0, levels: planet.levels };
  let at = planet.at;
  let queue = planet.queue;
  if (queue && queue.end <= now) {
    s = simulate(race, s, at, queue.end);
    at = queue.end;
    s = { ...s, levels: { ...s.levels, [queue.key]: queue.level } };
    queue = null;
  }
  s = simulate(race, s, at, now);
  // Rythme actuel, pour l'affichage (sur une seconde de jeu).
  const prod = flows(race, s.levels, s.pop, s.stock, 1 / 3600);
  return { stock: s.stock, pop: s.pop, levels: s.levels, queue, prod };
}

/** Version « solde » : écrit l'état courant dans la planète (par son propriétaire uniquement). */
export function settle(planet, now) {
  const s = stateAt(planet, now);
  const finished = planet.queue && !s.queue ? planet.queue : null;
  planet.stock = s.stock;
  planet.pop = s.pop;
  planet.at = now;
  planet.levels = s.levels;
  planet.queue = s.queue;
  return finished;
}

// ---------------------------------------------------------------------------
// Constructions
// ---------------------------------------------------------------------------

export function upgradeCost(race, key, level) {
  const b = RACES[race].buildings[key];
  const m = Math.pow(b.factor, level);
  return { minerals: Math.floor(b.base.minerals * m), energy: Math.floor(b.base.energy * m) };
}

/** Durée de construction en ms (accélérée). Le nœud de calcul des machines l'abrège. */
export function buildDuration(race, levels, cost) {
  const base = Math.max(4, Math.round((cost.minerals + cost.energy) / 25));
  const speed = race === 'machine' ? Math.pow(0.87, lv(levels, 'nexus')) : 1;
  return Math.max(4, Math.round(base * speed)) * 1000;
}

export function covers(stock, cost) {
  return Object.entries(cost).every(([r, v]) => (stock[r] || 0) + 1e-9 >= v);
}

function pay(planet, cost) {
  for (const [r, v] of Object.entries(cost)) planet.stock[r] -= v;
}

/** Valide et applique un ordre de construction. Renvoie une erreur lisible ou null. */
export function startBuild(planet, key, now) {
  const R = raceOf(planet);
  if (!R) return 'Choisis d’abord ta race.';
  if (!R.buildings[key]) return 'Bâtiment inconnu.';
  settle(planet, now);
  if (planet.queue) return 'Un chantier est déjà en cours.';
  const level = planet.levels[key] || 0;
  const cost = upgradeCost(planet.race, key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.queue = { key, level: level + 1, start: now, end: now + buildDuration(planet.race, planet.levels, cost) };
  return null;
}

// ---------------------------------------------------------------------------
// Pouvoirs psychiques (aliens)
// ---------------------------------------------------------------------------

/** Instant où le pouvoir redevient disponible (0 = prêt). */
export const powerReadyAt = (planet, key) => planet.powers?.[key] || 0;

export function powerCost(planet, key, pop = planet.pop) {
  return POWERS[key].cost(pop);
}

/**
 * Déclenche un pouvoir. Renvoie { error } ou { text } (résumé pour le journal).
 */
export function usePower(planet, key, now) {
  if (planet.race !== 'alien') return { error: 'Seuls les aliens ont des pouvoirs psychiques.' };
  const P = POWERS[key];
  if (!P) return { error: 'Pouvoir inconnu.' };
  settle(planet, now);
  if (powerReadyAt(planet, key) > now) return { error: 'Ce pouvoir se recharge encore.' };
  if (key === 'rush' && !planet.queue) return { error: 'Aucun chantier à accélérer.' };
  const cost = powerCost(planet, key);
  if (!covers(planet.stock, cost)) return { error: 'Pas assez d’énergie.' };
  pay(planet, cost);
  planet.powers = { ...(planet.powers || {}), [key]: now + P.cooldown };
  const amp = 1 + 0.25 * lv(planet.levels, 'amplifier');
  if (key === 'lift') {
    const gain = Math.floor(100 * planet.pop * amp);
    planet.stock.minerals = Math.min(Math.max(STORAGE, planet.stock.minerals), planet.stock.minerals + gain);
    return { text: `arrache ${fmt(gain)} minéraux par télékinésie` };
  }
  // rush : le chantier se termine maintenant.
  const q = planet.queue;
  planet.queue = { ...q, end: now };
  settle(planet, now);
  return { text: `achève ${RACES.alien.buildings[q.key].name} niv. ${q.level} par la pensée`, done: q };
}

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

/** Score : ressources investies dans les bâtiments. */
export function score(race, levels) {
  const R = RACES[race];
  if (!R) return 0;
  let total = 0;
  for (const k of Object.keys(R.buildings)) {
    for (let l = 0; l < (levels[k] || 0); l++) {
      const c = upgradeCost(race, k, l);
      total += c.minerals + c.energy;
    }
  }
  return Math.floor(total / 100);
}

/** Puissance : un humain vaut 1, un psionique 120 (plus de cent humains réunis). */
export function power(race, pop) {
  const R = RACES[race];
  return R ? Math.floor(pop * R.power) : 0;
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
