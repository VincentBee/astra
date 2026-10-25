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
export const RES = ['minerals', 'food', 'energy'];
/** Ressources tirées du sol de la planète : elles s'épuisent et se régénèrent. */
export const SOIL = ['minerals', 'food'];
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
//   food(effE)           : nourriture extraite du sol selon le courant reçu
//   foodOut              : nourriture mangée par la population
//   minerals(effE, effF) : minéraux extraits du sol selon courant et nourriture
//   mineralsBase         : revenu de base (impôt, récupération), tiré du sol lui aussi
//   popCap, caps         : plafonds (population, stocks)
// et une fonction `grow` pour la population.

/** Capacité des entrepôts : 1 000 au départ, ×1,7 par niveau d'entrepôt. */
export const storageCap = (level) => Math.round(1000 * Math.pow(1.7, level));

/** Plafond identique pour les trois ressources, fixé par l'entrepôt de la race. */
const capsFor = (levels) => {
  const c = storageCap(lv(levels, 'store'));
  return { minerals: c, food: c, energy: c };
};

// Équilibrage : on part avec de quoi lancer deux ou trois chantiers, l'énergie
// est juste à l'équilibre et presque rien ne tombe sans bâtiment. Chaque
// chantier pèse donc : monter une production sans l'énergie, la nourriture ou
// la place qui va avec provoque une pénurie, et les pénuries se propagent.

export const RACES = {
  human: {
    name: 'Humains',
    one: 'Humain',
    icon: '◆',
    color: '#7aa2ff',
    pitch: 'Une population nombreuse qui fait tourner mines et fermes.',
    traits: [
      'La population travaille : sans bras, mines et fermes tournent au ralenti.',
      'Elle grandit tant qu’il y a à manger et de la place dans les habitats.',
      'Famine : la population meurt, et la production s’effondre.',
    ],
    resources: ['minerals', 'food', 'energy'],
    start: { minerals: 200, food: 80, energy: 40 },
    pop: { label: 'Habitants', unit: 'habitant', start: 8, min: 3 },
    power: 1,
    buildings: {
      mine: {
        name: 'Mine',
        short: 'Mine',
        start: 1,
        desc: 'Minéraux. Emploie 10 ouvriers par niveau.',
        base: { minerals: 60, energy: 0 },
        factor: 1.5,
      },
      farm: {
        name: 'Ferme hydroponique',
        short: 'Ferme',
        start: 1,
        desc: 'Nourriture. Emploie 5 ouvriers par niveau, tourne à 30 % sans eux.',
        base: { minerals: 50, energy: 0 },
        factor: 1.5,
      },
      habitat: {
        name: 'Habitat',
        short: 'Habitat',
        start: 1,
        desc: 'Loge plus d’habitants.',
        base: { minerals: 70, energy: 0 },
        factor: 1.6,
      },
      solar: {
        name: 'Centrale solaire',
        short: 'Solaire',
        start: 1,
        desc: 'Énergie pour les bâtiments.',
        base: { minerals: 70, energy: 0 },
        factor: 1.5,
      },
      store: {
        name: 'Entrepôt',
        short: 'Entrepôt',
        start: 0,
        desc: 'Stocke plus de chaque ressource (×1,7 par niveau).',
        base: { minerals: 150, energy: 0 },
        factor: 1.7,
      },
    },
    rates(levels, pop) {
      const jobs = 10 * lv(levels, 'mine') + 5 * lv(levels, 'farm');
      const work = jobs > 0 ? Math.min(1, pop / jobs) : 1;
      return {
        work,
        jobs,
        energyIn: curve(20, lv(levels, 'solar')),
        energyOut:
          curve(10, lv(levels, 'mine')) + curve(6, lv(levels, 'farm')) + curve(3, lv(levels, 'habitat')) + curve(3, lv(levels, 'store')),
        food: (effE) => curve(18, lv(levels, 'farm')) * (0.3 + 0.7 * work) * effE,
        foodOut: 0.6 * pop,
        // Revenu de base + impôt (0,2 minéral par habitant), puis les mines.
        mineralsBase: 10 + 0.2 * pop,
        minerals: (effE) => curve(30, lv(levels, 'mine')) * work * effE,
        popCap: 15 + curve(20, lv(levels, 'habitat')),
        caps: capsFor(levels),
      };
    },
    /** Croissance logistique si nourris, mort par famine sinon. */
    grow(pop, cap, effF, effE, h) {
      if (effF < 1) return pop * Math.exp(-0.4 * (1 - effF) * h);
      if (pop > cap) return cap + (pop - cap) * Math.exp(-0.2 * h);
      const r = 0.12;
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
      'Les constructions coûtent aussi de l’énergie : il faut en garder en réserve.',
    ],
    resources: ['minerals', 'energy'],
    start: { minerals: 200, food: 0, energy: 60 },
    pop: null,
    power: 0,
    buildings: {
      drill: {
        name: 'Foreuse automatisée',
        short: 'Foreuse',
        start: 1,
        desc: 'Beaucoup de minéraux, beaucoup d’énergie.',
        base: { minerals: 60, energy: 25 },
        factor: 1.5,
      },
      reactor: {
        name: 'Réacteur à fusion',
        short: 'Réacteur',
        start: 1,
        desc: 'Énergie.',
        base: { minerals: 80, energy: 0 },
        factor: 1.55,
      },
      store: {
        name: 'Banque de stockage',
        short: 'Stockage',
        start: 0,
        desc: 'Stocke plus de minéraux et d’énergie (×1,7 par niveau).',
        base: { minerals: 120, energy: 40 },
        factor: 1.7,
      },
      nexus: {
        name: 'Nœud de calcul',
        short: 'Calcul',
        start: 0,
        desc: 'Optimise les foreuses : −12 % de consommation d’énergie par niveau, cumulé.',
        base: { minerals: 150, energy: 60 },
        factor: 1.8,
      },
    },
    rates(levels) {
      return {
        work: 1,
        energyIn: curve(24, lv(levels, 'reactor')),
        energyOut: curve(16, lv(levels, 'drill')) * Math.pow(0.88, lv(levels, 'nexus')) + curve(2, lv(levels, 'store')),
        food: () => 0,
        foodOut: 0,
        mineralsBase: 10,
        minerals: (effE) => curve(32, lv(levels, 'drill')) * effE,
        popCap: 0,
        caps: capsFor(levels),
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
      'Chaque psionique mange de la nourriture et consomme de l’énergie : préparez chaque naissance.',
      'Pouvoirs psychiques à déclencher : arrachement, transe.',
    ],
    resources: ['minerals', 'food', 'energy'],
    start: { minerals: 200, food: 60, energy: 60 },
    pop: { label: 'Psioniques', unit: 'psionique', start: 2, min: 1 },
    power: 120,
    buildings: {
      sanctuary: {
        name: 'Sanctuaire',
        short: 'Sanctuaire',
        start: 0,
        desc: 'Un psionique de plus peut y naître par niveau.',
        base: { minerals: 180, energy: 40 },
        factor: 1.9,
      },
      hive: {
        name: 'Ruche nourricière',
        short: 'Ruche',
        start: 1,
        desc: 'Nourriture.',
        base: { minerals: 55, energy: 0 },
        factor: 1.5,
      },
      prism: {
        name: 'Prisme psionique',
        short: 'Prisme',
        start: 1,
        desc: 'Énergie.',
        base: { minerals: 65, energy: 0 },
        factor: 1.5,
      },
      amplifier: {
        name: 'Amplificateur psychique',
        short: 'Amplificateur',
        start: 0,
        desc: 'Télékinésie et pouvoirs +25 % par niveau.',
        base: { minerals: 140, energy: 80 },
        factor: 1.7,
      },
      store: {
        name: 'Réserve organique',
        short: 'Réserve',
        start: 0,
        desc: 'Stocke plus de chaque ressource (×1,7 par niveau).',
        base: { minerals: 150, energy: 0 },
        factor: 1.7,
      },
    },
    rates(levels, pop) {
      const amp = 1 + 0.25 * lv(levels, 'amplifier');
      return {
        work: 1,
        energyIn: curve(22, lv(levels, 'prism')),
        energyOut: 7 * pop + curve(3, lv(levels, 'hive')) + curve(6, lv(levels, 'amplifier')) + curve(3, lv(levels, 'store')),
        food: (effE) => curve(18, lv(levels, 'hive')) * effE,
        foodOut: 7 * pop,
        // Extraction télékinésique : 25 minéraux par psionique, s'il est nourri et alimenté.
        mineralsBase: 5,
        minerals: (effE, effF, boost = 1) => 25 * pop * amp * boost * Math.min(effE, effF),
        popCap: 2 + lv(levels, 'sanctuary'),
        caps: capsFor(levels),
      };
    },
    /** Naissances lentes (un psionique toutes les ~8 h de jeu), dépérissement si privés. */
    grow(pop, cap, effF, effE, h) {
      const eff = Math.min(effF, effE);
      if (eff < 1) return pop - 0.25 * (1 - eff) * h;
      if (pop >= cap) return Math.max(cap, pop - 0.1 * h);
      return Math.min(cap, pop + 0.12 * h);
    },
  },
};

export const RACE_KEYS = Object.keys(RACES);

/** Pouvoirs psychiques des aliens. */
export const POWERS = {
  lift: {
    name: 'Arrachement télékinésique',
    desc: 'Arrache d’un coup au sol de la planète 60 minéraux par psionique.',
    cooldown: 180_000,
    cost: (pop) => ({ minerals: 0, energy: 30 * Math.ceil(pop) }),
  },
  trance: {
    name: 'Transe collective',
    desc: 'L’extraction télékinésique double pendant 2 minutes.',
    cooldown: 360_000,
    duration: 120_000,
    cost: (pop) => ({ minerals: 0, energy: 40 * Math.ceil(pop) }),
  },
};
export const POWER_KEYS = Object.keys(POWERS);

export const raceOf = (planet) => RACES[planet?.race] || null;

/**
 * Planète d'un joueur. `world` est la planète de l'univers où il s'installe
 * (voir planetsFor) : ses gisements deviennent ceux du joueur.
 */
export function newPlanet(race, now, world = null) {
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
    ...(world ? { nature: JSON.parse(JSON.stringify(world.nature)), reserve: { ...world.reserve } } : {}),
  };
}

// ---------------------------------------------------------------------------
// Économie
// ---------------------------------------------------------------------------

/**
 * Ce qu'on tire vraiment du sol, par heure de jeu : tout ce que demandent les
 * bâtiments tant que le gisement n'est pas vide ; une fois vide, pas plus que
 * ce que la planète produit d'elle-même.
 */
function extract(res, want, nature, reserve, h) {
  if (!nature?.[res]) return want; // planète d'avant les gisements : sans limite
  const avail = reserve[res] / h + nature[res].regen;
  return Math.min(want, avail);
}

/**
 * Flux sur `h` heures de jeu à partir d'un état. Les rendements `effE`
 * (courant) et `effF` (nourriture) valent 1 tant que le stock suffit ; en
 * pénurie, ils valent la part de la demande couverte. `nature` et `reserve`
 * sont les gisements de la planète (minéraux et nourriture du sol).
 */
export function flows(race, levels, pop, stock, h, boost = 1, nature = null, reserve = null) {
  const R = RACES[race];
  const r = R.rates(levels, pop);
  const needE = r.energyOut * h;
  const effE = needE > 0 ? Math.min(1, (stock.energy + r.energyIn * h) / needE) : 1;
  const foodWant = r.food(effE);
  const foodIn = extract('food', foodWant, nature, reserve, h);
  const needF = r.foodOut * h;
  const effF = needF > 0 ? Math.min(1, (stock.food + foodIn * h) / needF) : 1;
  // Tout ce qui entre dans le stock du joueur sort du sol de sa planète, revenu de base compris.
  const minedWant = r.mineralsBase + r.minerals(effE, effF, boost);
  const mined = extract('minerals', minedWant, nature, reserve, h);
  const mineralsIn = mined;
  return {
    effE,
    effF,
    // Extraction du sol : voulue par les bâtiments, et obtenue.
    soil: { minerals: { want: minedWant, got: mined }, food: { want: foodWant, got: foodIn } },
    work: r.work,
    jobs: r.jobs || 0,
    popCap: r.popCap,
    caps: r.caps,
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

const capOf = (res, f) => f.caps[res];

/** Un pas de `ms` millisecondes réelles. */
function advance(race, s, ms, boost) {
  const h = (Math.max(0, ms) / 3_600_000) * SPEED;
  if (h <= 0) return s;
  const f = flows(race, s.levels, s.pop, s.stock, h, boost, s.nature, s.reserve);
  const stock = {};
  const lost = {}; // ce qui ne rentre pas dans l'entrepôt plein
  for (const r of RES) {
    const cap = capOf(r, f);
    const v = s.stock[r] + f.net[r] * h;
    // Un entrepôt déjà plein ne déborde pas, mais n'est pas vidé non plus.
    stock[r] = Math.max(0, f.net[r] > 0 ? Math.max(s.stock[r], Math.min(cap, v)) : v);
    lost[r] = Math.max(0, v - stock[r]);
  }
  const R = RACES[race];
  let pop = s.pop;
  if (R.pop) pop = Math.max(R.pop.min, R.grow(s.pop, f.popCap, f.effF, f.effE, h));
  // Le sol se vide de ce qu'on extrait et se remplit de ce qu'il produit, jusqu'à son maximum.
  let reserve = s.reserve;
  if (s.nature && reserve) {
    reserve = { ...reserve };
    for (const k of SOIL) {
      const n = s.nature[k];
      // On ne puise que ce qui entre dans l'entrepôt : le reste reste dans le sol.
      const taken = Math.max(0, f.soil[k].got * h - lost[k]);
      if (n) reserve[k] = Math.min(n.max, Math.max(0, reserve[k] + n.regen * h - taken));
    }
  }
  return { ...s, stock, pop, reserve };
}

/** Fait avancer de `from` à `to` (ms), par 300 pas au plus. */
function steps(race, s, from, to, boost) {
  let t = from;
  const total = to - from;
  if (total <= 0) return s;
  const dt = Math.max(1000, total / 300);
  while (t < to) {
    const ms = Math.min(dt, to - t);
    s = advance(race, s, ms, boost);
    t += ms;
  }
  return s;
}

/** Idem, en coupant à la fin d'une transe (production doublée jusqu'à `trance`). */
function simulate(race, s, from, to, trance = 0) {
  if (trance > from) {
    const mid = Math.min(to, trance);
    s = steps(race, s, from, mid, 2);
    from = mid;
  }
  return steps(race, s, from, to, 1);
}

/**
 * État d'une planète à l'instant `now`, sans la modifier.
 * Applique une construction terminée entre-temps : ancien niveau jusqu'à la
 * fin du chantier, puis nouveau niveau.
 */
export function stateAt(planet, now) {
  const race = planet.race;
  let s = { stock: planet.stock, pop: planet.pop || 0, levels: planet.levels, nature: planet.nature, reserve: planet.reserve };
  let at = planet.at;
  let queue = planet.queue;
  if (queue && queue.end <= now) {
    s = simulate(race, s, at, queue.end, planet.trance);
    at = queue.end;
    s = { ...s, levels: { ...s.levels, [queue.key]: queue.level } };
    queue = null;
  }
  s = simulate(race, s, at, now, planet.trance);
  // Rythme actuel, pour l'affichage (sur une seconde de jeu).
  const prod = flows(race, s.levels, s.pop, s.stock, 1 / 3600, (planet.trance || 0) > now ? 2 : 1, s.nature, s.reserve);
  return { stock: s.stock, pop: s.pop, levels: s.levels, reserve: s.reserve, queue, prod };
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
  if (s.reserve) planet.reserve = s.reserve;
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

/** Durée de construction en ms (accélérée). */
export function buildDuration(race, levels, cost) {
  return Math.max(4, Math.round((cost.minerals + cost.energy) / 25)) * 1000;
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
  const cost = powerCost(planet, key);
  if (!covers(planet.stock, cost)) return { error: 'Pas assez d’énergie.' };
  pay(planet, cost);
  planet.powers = { ...(planet.powers || {}), [key]: now + P.cooldown };
  const amp = 1 + 0.25 * lv(planet.levels, 'amplifier');
  if (key === 'lift') {
    // Arraché au sol de la planète : pas plus que ce qu'il en reste, ni que ce que l'entrepôt peut recevoir.
    const soil = planet.nature?.minerals ? planet.reserve.minerals : Infinity;
    const cap = capsFor(planet.levels).minerals;
    const before = planet.stock.minerals;
    planet.stock.minerals = Math.min(Math.max(cap, before), before + Math.min(soil, 60 * planet.pop * amp));
    const gain = planet.stock.minerals - before;
    if (planet.nature?.minerals) planet.reserve = { ...planet.reserve, minerals: planet.reserve.minerals - gain };
    return { text: `arrache ${fmt(gain)} minéraux par télékinésie` };
  }
  // transe : extraction doublée pendant un temps.
  planet.trance = now + P.duration;
  return { text: 'entre en transe collective : extraction doublée 2 min' };
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
// Univers : grille 2D où sont posées les planètes
// ---------------------------------------------------------------------------

export const UNIVERSE = { w: 20, h: 20 };

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

// ---------------------------------------------------------------------------
// Planètes de l'univers
// ---------------------------------------------------------------------------
//
// Les planètes vides sont tirées au hasard au début de la partie, mais avec
// un hasard déterminé par l'identifiant de la partie : chaque téléphone
// calcule exactement les mêmes, sans rien avoir à se transmettre.

/** Plus de planètes que de joueurs possibles (8), pour avoir le choix. */
export const PLANET_COUNT = 14;
const PLANET_NAMES = [
  'Aldébaran', 'Bételgeuse', 'Céphée', 'Deneb', 'Éridan', 'Fomalhaut', 'Gemma', 'Hadar',
  'Izar', 'Kochab', 'Lyra', 'Mira', 'Nashira', 'Orion', 'Pollux', 'Rigel',
];

/** Générateur pseudo-aléatoire reproductible (mulberry32), graine tirée d'un texte. */
export function seeded(text) {
  let a = 2166136261;
  for (const c of String(text)) a = Math.imul(a ^ c.charCodeAt(0), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gisements possibles, par ressource du sol : un maximum et une production
 * de base (par minute réelle = heure de jeu), tirés entre deux bornes. Une
 * planète riche a un gros gisement ; une planète vivace se régénère vite.
 */
export const NATURE = {
  minerals: { max: [6000, 20000], regen: [15, 45] },
  food: { max: [1500, 6000], regen: [8, 25] },
};

const between = (random, [lo, hi], step = 1) => Math.round((lo + random() * (hi - lo)) / step) * step;

/**
 * Planètes de la partie `gid` : [{ id, name, x, y, nature, reserve }], les
 * mêmes sur tous les téléphones. Elles naissent pleines.
 */
export function planetsFor(gid) {
  const random = seeded(gid);
  // Mélange de Fisher-Yates : un nombre fixe de tirages, partout pareil (un
  // tri au comparateur aléatoire dépend du moteur JavaScript du téléphone).
  const names = PLANET_NAMES.slice();
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const out = [];
  for (let i = 0; i < PLANET_COUNT; i++) {
    const c = freeCell(out, random, 3);
    const nature = {};
    for (const k of SOIL) nature[k] = { max: between(random, NATURE[k].max, 100), regen: between(random, NATURE[k].regen, 5) };
    const reserve = Object.fromEntries(SOIL.map((k) => [k, nature[k].max]));
    out.push({ id: `p${i}`, name: names[i % names.length], x: c.x, y: c.y, nature, reserve });
  }
  return out;
}

export const sameCell = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
