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

import { techBonus, TECHS, SHIPS, techCost, techMissing, researchDuration, shipUnlocked, shipDuration, TEMPO } from './tech.js';

export { TEMPO };

/** Facteur de vitesse : 60 × TEMPO (à TEMPO 1, une « heure » de jeu dure une minute). */
export const SPEED = 60 * TEMPO;
export const RES = ['minerals', 'food', 'energy'];
/** Ressources tirées du sol de la planète : elles s'épuisent et se régénèrent. */
export const SOIL = ['minerals', 'food'];
export const RES_INFO = {
  minerals: { name: 'Minéraux' },
  food: { name: 'Nourriture' },
  energy: { name: 'Énergie' },
};

// Icônes des ressources (24 × 24, couleur du texte) : cristal, feuille, éclair, et un buste pour la population.
const RES_PATHS = {
  minerals: 'M7 3h10l4 6-9 12L3 9z',
  food: 'M20 3C10 3 4 8.5 4 15.5c0 1.6.3 3 .9 4.3 1-4.3 4.2-8.3 9.1-10.3-4.1 3-6.6 6.7-7.6 10.7C14.6 21 20 14.5 20 3z',
  energy: 'M13.5 2 4 14h7l-1.5 8L19 10h-7z',
  pop: 'M12 2.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM3.5 21.5c0-4.7 3.8-8 8.5-8s8.5 3.3 8.5 8z',
};

/** Icône SVG d'une ressource (ou de la population, 'pop'), à insérer en HTML : nommée pour les lecteurs d'écran. */
export const resIcon = (r, name = RES_INFO[r]?.name) =>
  `<svg class="ri ri-${r}" viewBox="0 0 24 24" role="img" aria-label="${name}"><title>${name}</title><path d="${RES_PATHS[r]}"/></svg>`;

// Icônes des races (24 × 24, trait, couleur du texte) : casque d'astronaute,
// tête de robot, tête d'alien aux grands yeux.
const RACE_PATHS = {
  human: 'M12 2.5a6.5 6.5 0 0 1 6.5 6.5v2a6.5 6.5 0 0 1-13 0V9A6.5 6.5 0 0 1 12 2.5zM8.5 8.5h7V11a3.5 3.5 0 0 1-7 0zM3.5 22c.8-2.6 4-4 8.5-4s7.7 1.4 8.5 4',
  machine: 'M5 7h14v11H5zM12 3v4M9.5 11v2M14.5 11v2M9 15.5h6M2.5 10.5v4M21.5 10.5v4M8 21h8M12 18v3',
  alien: 'M12 2.5c4.7 0 8 3.3 8 7.5 0 5-4.5 11.5-8 11.5S4 15 4 10c0-4.2 3.3-7.5 8-7.5zM6.5 10c2.4 0 4.2 1.3 4.5 3.6-2.4 0-4.2-1.3-4.5-3.6zM17.5 10c-2.4 0-4.2 1.3-4.5 3.6 2.4 0 4.2-1.3 4.5-3.6z',
};

/** Icône SVG d'une race, à insérer en HTML : nommée pour les lecteurs d'écran. */
export const raceIcon = (r) =>
  `<svg class="rci" viewBox="0 0 24 24" role="img" aria-label="${RACES[r].name}"><title>${RACES[r].name}</title><path d="${RACE_PATHS[r]}"/></svg>`;

/** a x L x 1.1^L, arrondi au millionième (évite le bruit des flottants). */
function curve(a, level) {
  return Math.round(a * level * Math.pow(1.1, level) * 1e6) / 1e6;
}

const lv = (levels, k) => levels[k] || 0;
/** `table[key]` si c'est une vraie entrée de la table (pas `constructor`, `__proto__`…), sinon null. */
const own = (table, key) => (table && Object.hasOwn(table, key) ? table[key] : null);

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

/** Énergie consommée par le labo et le chantier naval (toutes races). */
const space = (levels) => curve(5, lv(levels, 'lab')) + curve(5, lv(levels, 'yard'));

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
      lab: {
        name: 'Laboratoire de recherche',
        short: 'Labo',
        start: 0,
        desc: 'Ouvre la recherche sur cette planète. Chaque niveau l’accélère et ouvre des technologies.',
        base: { minerals: 200, energy: 0 },
        factor: 1.8,
      },
      yard: {
        name: 'Chantier spatial',
        short: 'Chantier',
        start: 0,
        desc: 'Construit les vaisseaux. Chaque niveau accélère la construction.',
        base: { minerals: 250, energy: 0 },
        factor: 1.8,
      },
      cannon: {
        name: 'Batterie de canons',
        short: 'Canons',
        start: 0,
        desc: 'Défense : ⚔ 12 et ◇ 40 par niveau. Polyvalente.',
        base: { minerals: 130, energy: 0 },
        factor: 1.5,
        defense: { attack: 12, hull: 40 },
      },
      shield: {
        name: 'Bouclier déflecteur',
        short: 'Bouclier',
        start: 0,
        desc: 'Défense : ◇ 150 par niveau. Encaisse sans riposter.',
        base: { minerals: 140, energy: 0 },
        factor: 1.5,
        defense: { attack: 0, hull: 150 },
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
          curve(10, lv(levels, 'mine')) + curve(6, lv(levels, 'farm')) + curve(3, lv(levels, 'habitat')) + curve(3, lv(levels, 'store')) + space(levels),
        food: (effE) => curve(18, lv(levels, 'farm')) * (0.3 + 0.7 * work) * effE,
        foodOut: 0.6 * pop,
        // Revenu de base + impôt (0,4 minéral par habitant), puis les mines.
        mineralsBase: 10 + 0.4 * pop,
        minerals: (effE) => curve(36, lv(levels, 'mine')) * work * effE,
        popCap: 15 + curve(20, lv(levels, 'habitat')),
        caps: capsFor(levels),
      };
    },
    /** Croissance logistique si nourris, mort par famine sinon. */
    grow(pop, cap, effF, effE, h) {
      // Au-dessus du plafond, la population redescend au moins aussi vite que si elle était nourrie.
      const over = pop > cap ? cap + (pop - cap) * Math.exp(-0.2 * h) : Infinity;
      if (effF < 1) return Math.min(over, pop * Math.exp(-0.4 * (1 - effF) * h));
      if (pop > cap) return over;
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
      lab: {
        name: 'Matrice de recherche',
        short: 'Matrice',
        start: 0,
        desc: 'Ouvre la recherche sur cette planète. Chaque niveau l’accélère et ouvre des technologies.',
        base: { minerals: 180, energy: 70 },
        factor: 1.8,
      },
      yard: {
        name: 'Usine orbitale',
        short: 'Usine',
        start: 0,
        desc: 'Assemble les vaisseaux. Chaque niveau accélère l’assemblage.',
        base: { minerals: 220, energy: 80 },
        factor: 1.8,
      },
      turret: {
        name: 'Tourelles automatiques',
        short: 'Tourelles',
        start: 0,
        desc: 'Défense : ⚔ 18 et ◇ 15 par niveau. Bon marché, frappe fort, casse vite.',
        base: { minerals: 90, energy: 30 },
        factor: 1.45,
        defense: { attack: 18, hull: 15 },
      },
      shield: {
        name: 'Blindage réactif',
        short: 'Blindage',
        start: 0,
        desc: 'Défense : ◇ 90 par niveau. Bon marché.',
        base: { minerals: 90, energy: 30 },
        factor: 1.45,
        defense: { attack: 0, hull: 90 },
      },
    },
    rates(levels) {
      return {
        work: 1,
        energyIn: curve(24, lv(levels, 'reactor')),
        energyOut: curve(16, lv(levels, 'drill')) * Math.pow(0.88, lv(levels, 'nexus')) + curve(2, lv(levels, 'store')) + space(levels),
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
      lab: {
        name: 'Bassin de songe',
        short: 'Bassin',
        start: 0,
        desc: 'Les psioniques y rêvent les technologies. Chaque niveau accélère la recherche.',
        base: { minerals: 220, energy: 50 },
        factor: 1.8,
      },
      yard: {
        name: 'Couveuse astrale',
        short: 'Couveuse',
        start: 0,
        desc: 'Fait éclore les vaisseaux vivants. Chaque niveau accélère l’éclosion.',
        base: { minerals: 260, energy: 60 },
        factor: 1.8,
      },
      spines: {
        name: 'Épines psioniques',
        short: 'Épines',
        start: 0,
        desc: 'Défense : ⚔ 8 par niveau, plus 1 par psionique. Plus la ruche est peuplée, plus elle mord.',
        base: { minerals: 200, energy: 40 },
        factor: 1.6,
        defense: { attack: 8, hull: 60, perPop: 1 },
      },
      dome: {
        name: 'Dôme psychique',
        short: 'Dôme',
        start: 0,
        desc: 'Défense : ◇ 260 par niveau. Cher, mais presque infranchissable.',
        base: { minerals: 240, energy: 60 },
        factor: 1.6,
        defense: { attack: 0, hull: 260 },
      },
    },
    rates(levels, pop) {
      const amp = 1 + 0.25 * lv(levels, 'amplifier');
      return {
        work: 1,
        energyIn: curve(22, lv(levels, 'prism')),
        energyOut: 7 * pop + curve(3, lv(levels, 'hive')) + curve(6, lv(levels, 'amplifier')) + curve(3, lv(levels, 'store')) + space(levels),
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
      // Au-dessus du plafond, ils redescendent au moins aussi vite que s'ils étaient nourris.
      if (eff < 1) return Math.min(pop - 0.25 * (1 - eff) * h, pop > cap ? Math.max(cap, pop - 0.1 * h) : Infinity);
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
    desc: 'Arrache d’un coup au sol de la planète 40 minéraux par psionique.',
    cooldown: 180_000 / TEMPO,
    cost: (pop) => ({ minerals: 0, energy: 30 * Math.ceil(pop) }),
  },
  trance: {
    name: 'Transe collective',
    desc: `L’extraction télékinésique double pendant ${Math.round(120 / TEMPO)} s.`,
    cooldown: 360_000 / TEMPO,
    duration: 120_000 / TEMPO,
    cost: (pop) => ({ minerals: 0, energy: 25 * Math.ceil(pop) }),
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
    ...(world?.climate ? { climate: { ...world.climate } } : {}),
    ...(world?.places ? { places: world.places, kind: world.kind } : {}),
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
export function flows(race, levels, pop, stock, h, boost = 1, nature = null, reserve = null, tech = null, climate = null) {
  const R = RACES[race];
  const r = R.rates(levels, pop);
  const t = techBonus(race, tech);
  // Le climat de la planète s'ajoute aux technologies (planète d'avant le climat : ×1).
  const b = { ...t, energy: t.energy * (climate?.energy ?? 1), food: t.food * (climate?.food ?? 1), minerals: t.minerals * (climate?.minerals ?? 1) };
  r.energyIn *= b.energy;
  const needE = r.energyOut * h;
  const effE = needE > 0 ? Math.min(1, (stock.energy + r.energyIn * h) / needE) : 1;
  const foodWant = r.food(effE) * b.food;
  const foodIn = extract('food', foodWant, nature, reserve, h);
  const needF = r.foodOut * h;
  const effF = needF > 0 ? Math.min(1, (stock.food + foodIn * h) / needF) : 1;
  // Tout ce qui entre dans le stock du joueur sort du sol de sa planète, revenu de base compris.
  const minedWant = r.mineralsBase + r.minerals(effE, effF, boost) * b.minerals;
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
  const f = flows(race, s.levels, s.pop, s.stock, h, boost, s.nature, s.reserve, s.tech, s.climate);
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

/**
 * Fait avancer de `from` à `to` (ms réelles). Des pas de 2 h de jeu au plus
 * (2 min réelles au tempo d'origine) : plus longs, une longue absence ne
 * donnerait pas la même population que des passages réguliers.
 */
function steps(race, s, from, to, boost) {
  let t = from;
  const total = to - from;
  if (total <= 0) return s;
  // Pas de 2 h de jeu au plus, même après des jours d'absence : de plus grands pas changeaient la population.
  const dt = Math.max(1000, Math.min(120_000 / TEMPO, total / 300));
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

/** Taille maximale du fil de construction d'une planète. */
export const PLAN_MAX = 8;

/** Places libres pour ces niveaux (les planètes d'avant la place n'ont pas de limite). */
const freePlaces = (places, levels) => (Number.isFinite(places) ? places - usedPlaces(levels) : Infinity);

/**
 * Fait avancer `s` de `from` vers `to` jusqu'à ce que le stock couvre `cost`
 * (vérifié avant de partir, puis après chaque pas). Les pas sont ceux de
 * `steps` (300 au plus, 2 h de jeu au plus). Renvoie { s, at, ok }.
 */
function until(race, s, from, to, cost, trance) {
  if (covers(s.stock, cost)) return { s, at: from, ok: true };
  const dt = Math.max(1000, Math.min(120_000 / TEMPO, (to - from) / 300));
  let t = from;
  while (t < to) {
    const ms = Math.min(dt, to - t);
    s = advance(race, s, ms, trance > t ? 2 : 1);
    t += ms;
    if (covers(s.stock, cost)) return { s, at: t, ok: true };
  }
  return { s, at: to, ok: false };
}

/**
 * État d'une planète à l'instant `now`, sans la modifier.
 * Trois files d'attente peuvent finir entre-temps, chacune à son heure : le
 * chantier (bâtiment), la recherche (technologie) et le chantier naval (lot
 * de vaisseaux). On calcule l'économie jusqu'à chaque fin, on applique son
 * effet, puis on continue : un bâtiment ou une technologie terminés
 * changent la production à partir de cet instant-là.
 *
 * Fil de construction (`plan`, D-105) : chantier libre, le premier bâtiment
 * du fil se lance tout seul dès que le stock couvre son prix (et qu'il reste
 * une place). Même calcul pour tous : chez le propriétaire, au rattrapage
 * après une absence, et pour les estimations (voir planForecast).
 */
export function stateAt(planet, now) {
  const race = planet.race;
  let s = {
    stock: planet.stock,
    pop: planet.pop || 0,
    levels: planet.levels,
    nature: planet.nature,
    climate: planet.climate,
    reserve: planet.reserve,
    tech: planet.tech || {},
    ships: planet.ships || {},
  };
  let at = planet.at;
  const q = { queue: planet.queue || null, research: planet.research || null, yard: planet.yard || null };
  const plan = Array.isArray(planet.plan) ? [...planet.plan] : [];
  const done = [];
  for (;;) {
    const next = Object.entries(q)
      .filter(([, v]) => v && v.end <= now)
      .sort((x, y) => x[1].end - y[1].end || (x[0] < y[0] ? -1 : 1))[0];
    // Chantier libre : le fil attend que le stock couvre le prix, au plus jusqu'au prochain événement.
    const key = plan[0];
    if (!q.queue && key && own(RACES[race].buildings, key) && freePlaces(planet.places, s.levels) > 0) {
      const level = s.levels[key] || 0;
      const cost = upgradeCost(race, key, level);
      const limit = next ? Math.max(at, next[1].end) : now;
      const r = until(race, s, at, limit, cost, planet.trance || 0);
      s = r.s;
      at = Math.max(at, r.at);
      if (r.ok) {
        const stock = { ...s.stock };
        for (const [k, v] of Object.entries(cost)) stock[k] -= v;
        s = { ...s, stock };
        q.queue = { key, level: level + 1, start: at, end: at + buildDuration(race, s.levels, cost) };
        plan.shift();
        done.push({ kind: 'start', ...q.queue });
        continue;
      }
    }
    if (!next) break;
    const [kind, job] = next;
    s = simulate(race, s, at, job.end, planet.trance);
    at = Math.max(at, job.end); // un ordre daté d'avant (vieille fiche) ne fait pas recompter
    if (kind === 'queue') s = { ...s, levels: { ...s.levels, [job.key]: job.level } };
    else if (kind === 'research') s = { ...s, tech: { ...s.tech, [job.key]: job.level } };
    else s = { ...s, ships: { ...s.ships, [job.type]: (s.ships[job.type] || 0) + job.count } };
    done.push({ kind, ...job });
    q[kind] = null;
  }
  s = simulate(race, s, at, now, planet.trance);
  // Rythme actuel, pour l'affichage (sur une seconde de jeu).
  const prod = flows(race, s.levels, s.pop, s.stock, 1 / 3600, (planet.trance || 0) > now ? 2 : 1, s.nature, s.reserve, s.tech, s.climate);
  return { stock: s.stock, pop: s.pop, levels: s.levels, reserve: s.reserve, tech: s.tech, ships: s.ships, ...q, plan, done, prod };
}

/**
 * Estimation du fil de construction, pour l'affichage seulement : quand
 * chaque bâtiment du fil devrait commencer et finir, si la production
 * reste celle d'aujourd'hui (bâtiments, recherches et vaisseaux déjà lancés
 * compris). Deux passes : 10 min à la seconde près, puis 6 h, plus grossière.
 * Renvoie [{ key, level, cost, start, end }] dans l'ordre du fil ; `start`
 * vaut null si rien n'arrive dans les 6 h, et `why` dit ce qui bloque quand
 * on le sait (plus de place, entrepôt trop petit).
 */
export function planForecast(planet, now) {
  const s = stateAt(planet, now);
  if (!s.plan.length) return [];
  // Ce qui s'est déjà lancé avant `now` (pas encore écrit dans la fiche) ne compte plus.
  const gone = (planet.plan || []).length - s.plan.length;
  const passes = [10 * 60_000, 6 * 3_600_000].map((h) => stateAt(planet, now + h).done.filter((d) => d.kind === 'start').slice(gone));
  // Niveau, prix et places tels qu'au lancement de chaque élément, si tout passe dans l'ordre.
  const levels = { ...s.levels };
  if (s.queue) levels[s.queue.key] = s.queue.level;
  const caps = s.prod.caps || {};
  let free = freePlaces(planet.places, levels);
  return s.plan.map((key, i) => {
    const level = levels[key] || 0;
    const cost = upgradeCost(planet.race, key, level);
    levels[key] = level + 1;
    const hit = passes.map((p) => p[i]).find((d) => d && d.key === key) || null;
    let why = null;
    if (!hit) {
      if (free <= 0) why = 'Plus de place';
      else if (Object.entries(cost).some(([r, v]) => v > (caps[r] ?? Infinity))) why = 'Entrepôt trop petit';
    }
    free -= 1;
    return { key, level: level + 1, cost, start: hit?.start ?? null, end: hit?.end ?? null, why };
  });
}

/**
 * Version « solde » : écrit l'état courant dans la planète (par son
 * propriétaire uniquement). Renvoie ce qui s'est terminé ou lancé (fil de
 * construction) entre-temps : [{ kind: 'queue' | 'research' | 'yard' | 'start', ... }].
 */
export function settle(planet, now) {
  // Une heure qui recule (ou invalide) ne doit pas faire recompter la production déjà comptée.
  if (!Number.isFinite(now)) return [];
  now = Math.max(now, planet.at || 0);
  const s = stateAt(planet, now);
  planet.stock = s.stock;
  planet.pop = s.pop;
  planet.at = now;
  planet.levels = s.levels;
  planet.queue = s.queue;
  if (planet.plan || s.plan.length) planet.plan = s.plan;
  planet.research = s.research;
  planet.yard = s.yard;
  planet.tech = s.tech;
  planet.ships = s.ships;
  if (s.reserve) planet.reserve = s.reserve;
  return s.done;
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
  return Math.round((Math.max(4, Math.round((cost.minerals + cost.energy) / 25)) * 1000) / TEMPO);
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
  if (!own(R.buildings, key)) return 'Bâtiment inconnu.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  if (planet.queue) return 'Un chantier est déjà en cours.';
  if (placesLeft(planet) <= 0) return `Plus de place : les ${planet.places} places de cette planète sont prises.`;
  const level = planet.levels[key] || 0;
  const cost = upgradeCost(planet.race, key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.queue = { key, level: level + 1, start: now, end: now + buildDuration(planet.race, planet.levels, cost) };
  return null;
}

/**
 * Déconstruit un niveau du bâtiment `key` : occupe le chantier pendant la
 * moitié du temps de construction de ce niveau, rend tout de suite la
 * moitié de son coût, et libère sa place à la fin. Renvoie une erreur
 * lisible ou null.
 */
export function startDemolish(planet, key, now) {
  const R = raceOf(planet);
  if (!R) return 'Choisis d’abord ta race.';
  if (!own(R.buildings, key)) return 'Bâtiment inconnu.';
  settle(planet, now);
  now = planet.at;
  if (planet.queue) return 'Un chantier est déjà en cours.';
  const level = planet.levels[key] || 0;
  if (level < 1) return 'Rien à déconstruire.';
  const cost = upgradeCost(planet.race, key, level - 1);
  for (const [r, v] of Object.entries(cost)) planet.stock[r] = (planet.stock[r] || 0) + Math.floor(v / 2);
  planet.queue = { key, level: level - 1, start: now, end: now + Math.round(buildDuration(planet.race, planet.levels, cost) / 2), demolish: true };
  return null;
}

// ---------------------------------------------------------------------------
// Recherche et chantier naval (sur toute planète qui a le bâtiment)
// ---------------------------------------------------------------------------

/** Lance une recherche sur cette planète, avec son labo. Renvoie une erreur lisible ou null. */
export function startResearch(planet, key, now) {
  const T = own(TECHS[planet.race], key);
  if (!T) return 'Technologie inconnue.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  const lab = lv(planet.levels, 'lab');
  if (!lab) return 'Construis d’abord un labo.';
  if (planet.research) return 'Une recherche est déjà en cours.';
  const level = planet.tech?.[key] || 0;
  if (level >= T.max) return 'Niveau maximum atteint.';
  const miss = techMissing(planet.race, key, planet.tech, lab);
  if (miss) return `Il faut d’abord : ${miss}.`;
  const cost = techCost(planet.race, key, level);
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.research = { key, level: level + 1, start: now, end: now + researchDuration(cost, lab) };
  return null;
}

/** Plus grand lot de vaisseaux `type` que le stock `stock` peut payer (0 à 50, la taille maximale d'un lot). */
export function shipsAffordable(race, type, stock) {
  const S = own(SHIPS[race], type);
  if (!S) return 0;
  let n = 50;
  for (const [r, v] of Object.entries(S.cost)) if (v > 0) n = Math.min(n, Math.floor((stock[r] || 0) / v));
  return Math.max(0, n);
}

/** Lance un lot de vaisseaux au chantier naval de cette planète. */
export function startShips(planet, type, count, now) {
  const S = own(SHIPS[planet.race], type);
  if (!S) return 'Vaisseau inconnu.';
  count = Math.floor(count);
  if (!(count >= 1 && count <= 50)) return 'Entre 1 et 50 vaisseaux par lot.';
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  const yard = lv(planet.levels, 'yard');
  if (!yard) return 'Construis d’abord un chantier naval.';
  if (planet.yard) return 'Le chantier naval est déjà occupé.';
  if (!shipUnlocked(planet.race, type, planet.tech)) return 'Ce vaisseau n’est pas encore recherché.';
  const cost = Object.fromEntries(Object.entries(S.cost).map(([r, v]) => [r, v * count]));
  if (!covers(planet.stock, cost)) return 'Ressources insuffisantes.';
  pay(planet, cost);
  planet.yard = { type, count, start: now, end: now + shipDuration(planet.race, type, count, yard) };
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
/**
 * Minéraux qu'un arrachement ajouterait : pas plus que ce qu'il reste au sol,
 * ni que ce que l'entrepôt peut recevoir.
 */
/** Minéraux arrachés par psionique (avant l'amplificateur). */
const LIFT_PER_PSI = 40;

export function liftGain(planet, amp = 1 + 0.25 * lv(planet.levels, 'amplifier')) {
  const soil = planet.nature?.minerals ? planet.reserve.minerals : Infinity;
  const cap = capsFor(planet.levels).minerals;
  const before = planet.stock.minerals;
  return Math.max(0, Math.min(Math.max(cap, before), before + Math.min(soil, LIFT_PER_PSI * planet.pop * amp)) - before);
}

export function usePower(planet, key, now) {
  if (planet.race !== 'alien') return { error: 'Seuls les aliens ont des pouvoirs psychiques.' };
  const P = own(POWERS, key);
  if (!P) return { error: 'Pouvoir inconnu.' };
  settle(planet, now);
  now = planet.at; // heure qui recule : l'ordre part de l'heure déjà comptée, pas d'avant
  if (powerReadyAt(planet, key) > now) return { error: 'Ce pouvoir se recharge encore.' };
  const cost = powerCost(planet, key);
  if (!covers(planet.stock, cost)) return { error: 'Pas assez d’énergie.' };
  const amp = 1 + 0.25 * lv(planet.levels, 'amplifier');
  const gain = key === 'lift' ? liftGain(planet, amp) : 0;
  // La transe double l'extraction : sur un sol vide, il n'y a rien à doubler.
  if (key === 'trance' && planet.nature?.minerals && planet.reserve.minerals < 1) return { error: 'Le sol est vide : la transe n’extrairait rien de plus.' };
  if (key === 'lift' && gain <= 0) return { error: planet.nature?.minerals && !planet.reserve.minerals ? 'Le sol est vide : rien à arracher.' : 'L’entrepôt de minéraux est plein.' };
  pay(planet, cost);
  planet.powers = { ...(planet.powers || {}), [key]: now + P.cooldown };
  if (key === 'lift') {
    planet.stock.minerals += gain;
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
    if (k === 'store') continue; // empiler des entrepôts ne rend pas plus fort : il ne compte pas
    for (let l = 0; l < (levels[k] || 0); l++) {
      const c = upgradeCost(race, k, l);
      total += c.minerals + c.energy;
    }
  }
  return Math.floor(total / 100);
}

/**
 * Points d'un empire : les bâtiments de toutes ses planètes (hors entrepôts),
 * ses recherches et ses vaisseaux, posés ou en vol (prix / 100). Ils
 * départagent les joueurs que le froid prend en même temps.
 */
export function empireScore(race, planets, fleets = []) {
  if (!RACES[race]) return 0;
  let total = 0;
  const tech = planets[0]?.tech || {};
  for (const [k, n] of Object.entries(tech)) {
    if (!Object.hasOwn(TECHS[race], k)) continue;
    for (let l = 0; l < (Number(n) || 0); l++) for (const v of Object.values(techCost(race, k, l))) total += v;
  }
  const ships = (list) => {
    for (const [t, n] of Object.entries(list || {})) {
      if (!Object.hasOwn(SHIPS[race], t)) continue;
      for (const v of Object.values(SHIPS[race][t].cost)) total += v * Math.max(0, Number(n) || 0);
    }
  };
  for (const pl of planets) ships(pl.ships);
  for (const f of fleets) ships(f.ships);
  return Math.floor(total / 100) + planets.reduce((t, pl) => t + score(race, pl.levels || {}), 0);
}

/**
 * Défense d'une planète, qui se bat comme un seul gros vaisseau : ⚔ 2 et
 * ◇ 20 par niveau de bâtiment ordinaire, plus les bâtiments de défense de
 * sa race (canons, boucliers…). Pour prendre ou piller la planète, il faut
 * l'abattre avec des vaisseaux d'attaque, en même temps que ceux posés dessus.
 */
export function fortOf(race, levels, pop = 0) {
  const R = RACES[race];
  const out = { attack: 0, hull: 0 };
  if (!R) return out;
  for (const [k, b] of Object.entries(R.buildings)) {
    const n = Math.max(0, Number(levels?.[k]) || 0);
    if (!n) continue;
    const d = b.defense || { attack: 2, hull: 20 };
    out.attack += n * (d.attack + (d.perPop || 0) * Math.floor(pop));
    out.hull += n * d.hull;
  }
  return out;
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
 * Case de départ libre, à au moins `minGap` pas des planètes existantes, et
 * acceptée par `ok`. `random` est injectable pour les tests.
 */
export function freeCell(taken, random = Math.random, minGap = 4, ok = () => true) {
  for (let gap = minGap; gap >= 0; gap--) {
    for (let tries = 0; tries < 200; tries++) {
      const c = { x: 1 + Math.floor(random() * (UNIVERSE.w - 2)), y: 1 + Math.floor(random() * (UNIVERSE.h - 2)) };
      if (ok(c) && taken.every((t) => distance(t, c) >= Math.max(gap, 1))) return c;
    }
  }
  const center = { x: Math.floor(UNIVERSE.w / 2), y: Math.floor(UNIVERSE.h / 2) };
  if (ok(center)) return center;
  // Dernier recours : la première case libre en partant du coin.
  for (let y = 0; y < UNIVERSE.h; y++) {
    for (let x = 0; x < UNIVERSE.w; x++) {
      const c = { x, y };
      if (ok(c) && !taken.some((t) => sameCell(t, c))) return c;
    }
  }
  return center;
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
/** Places d'une planète : de 14 à 22 (à 12, les humains n'avaient plus de quoi s'équiper). */
export const PLANET_PLACES = [14, 22];

/**
 * Petits corps, en plus des planètes : on ne s'y installe pas au départ,
 * mais on peut les coloniser. Leurs gisements sont une fraction de ceux
 * d'une planète : l'astéroïde est surtout de la roche, la comète surtout de
 * la glace (de quoi faire de la nourriture).
 */
export const SMALL_BODIES = {
  asteroid: { label: 'Astéroïde', count: 4, places: [7, 10], share: { minerals: 0.35, food: 0.1 }, names: ['Cérès', 'Vesta', 'Pallas', 'Junon', 'Hygie', 'Éros'] },
  comet: { label: 'Comète', count: 3, places: [6, 8], share: { minerals: 0.2, food: 0.35 }, names: ['Halley', 'Encke', 'Tempel', 'Hale-Bopp', 'Swift'] },
};

/** « Planète », « Astéroïde » ou « Comète ». */
export const kindLabel = (kind) => SMALL_BODIES[kind]?.label || 'Planète';
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
  minerals: { max: [60000, 200000], regen: [150, 450] },
  food: { max: [15000, 60000], regen: [80, 250] },
};

/**
 * Soleil de la partie `gid` : un carré de 2 × 2 à 4 × 4 cases au milieu de
 * la carte, de taille tirée au hasard (le même sur tous les téléphones).
 * Sur une carte de côté pair, le 3 × 3 est décalé d'une demi-case.
 */
export function sunFor(gid) {
  const size = 2 + Math.floor(seeded(`${gid}/soleil`)() * 3);
  return { x: Math.floor((UNIVERSE.w - size) / 2), y: Math.floor((UNIVERSE.h - size) / 2), size };
}

/** La case `c` est-elle dans le soleil ? */
export const inSun = (sun, c) => c.x >= sun.x && c.x < sun.x + sun.size && c.y >= sun.y && c.y < sun.y + sun.size;

const round2 = (v) => Math.round(v * 100) / 100;

/**
 * Climat d'une case : sa chaleur `heat` (1 au bord du soleil, 0 dans le coin
 * le plus loin) et ce qu'elle fait à la production. Près du soleil, beaucoup
 * d'énergie solaire et un sol volcanique riche en minéraux ; la nourriture
 * pousse mieux en zone tempérée qu'au chaud ou au froid.
 */
export function climateAt(sun, c) {
  const { d, far } = sunDistance(sun, c);
  const heat = round2(Math.min(1, Math.max(0, 1 - d / far)));
  return {
    heat,
    energy: round2(0.8 + 0.4 * heat),
    minerals: round2(0.9 + 0.2 * heat),
    food: round2(1.3 - 1.4 * Math.abs(heat - 0.5)),
  };
}

/** Distance d'une case au bord du soleil `d`, et la plus grande possible `far` (en cases). */
export function sunDistance(sun, c) {
  const mid = { x: sun.x + sun.size / 2, y: sun.y + sun.size / 2 };
  const far = Math.hypot(Math.max(mid.x, UNIVERSE.w - mid.x), Math.max(mid.y, UNIVERSE.h - mid.y)) - sun.size / 2;
  const d = Math.hypot(c.x + 0.5 - mid.x, c.y + 0.5 - mid.y) - sun.size / 2;
  return { d: Math.min(far, Math.max(0, d)), far };
}

/**
 * Le soleil s'éteint. `delayMs` après le début de la course, le froid part
 * du coin le plus loin et se resserre vers le soleil, qu'il atteint
 * `durationMs` plus tard. Une planète que le froid atteint est perdue :
 * il faut migrer vers le centre, où il y a de moins en moins de place.
 * `ease` > 1 : il avance lentement au début, puis de plus en plus vite.
 */
export const FROST = { delayMs: 12 * 60_000, durationMs: 24 * 60_000, ease: 2 };

/** Heure à laquelle le froid atteint la case `c` (la course a commencé à `start`). */
export function frostAt(sun, start, c) {
  const { d, far } = sunDistance(sun, c);
  return start + FROST.delayMs + FROST.durationMs * Math.pow(1 - d / far, 1 / FROST.ease);
}

/** Distance au soleil où passe le froid à `now` (Infinity avant son départ). */
export function frostLine(sun, start, now) {
  const { far } = sunDistance(sun, sun);
  const k = (now - start - FROST.delayMs) / FROST.durationMs;
  return k < 0 || !Number.isFinite(k) ? Infinity : Math.max(0, far * (1 - Math.pow(Math.min(1, k), FROST.ease)));
}

/** Nom du climat selon la chaleur. */
export function climateName(heat) {
  if (heat >= 0.8) return 'Brûlant';
  if (heat >= 0.6) return 'Chaud';
  if (heat >= 0.4) return 'Tempéré';
  if (heat >= 0.2) return 'Froid';
  return 'Glacé';
}

/** Nombre entier de `lo` à `hi`, chacun aussi souvent (between arrondit : les bornes sortent deux fois moins). */
const pick = (random, [lo, hi]) => lo + Math.min(hi - lo, Math.floor(random() * (hi - lo + 1)));

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
  // Une planète tirée dans le soleil est replacée ensuite, avec un hasard à
  // part : les autres restent où elles étaient avant le soleil, ce qui garde
  // les parties déjà commencées.
  const sun = sunFor(gid);
  const elsewhere = seeded(`${gid}/hors-soleil`);
  for (const w of out) {
    if (!inSun(sun, w)) continue;
    const c = freeCell(out.filter((x) => x !== w), elsewhere, 3, (x) => !inSun(sun, x));
    w.x = c.x;
    w.y = c.y;
  }
  // Places et petits corps : tirés avec leur propre hasard, ajoutés après les
  // planètes, pour que celles-ci restent où elles étaient dans les parties déjà commencées.
  const sizes = seeded(`${gid}/taille`);
  for (const w of out) Object.assign(w, { kind: 'planet', places: pick(sizes, PLANET_PLACES) });
  const small = seeded(`${gid}/petits-corps`);
  for (const [kind, b] of Object.entries(SMALL_BODIES)) {
    const names = b.names.slice();
    for (let i = 0; i < b.count; i++) {
      const c = freeCell(out, small, 2, (x) => !inSun(sun, x));
      const nature = {};
      for (const k of SOIL) {
        const max = Math.max(100, Math.round((between(small, NATURE[k].max) * b.share[k]) / 100) * 100);
        nature[k] = { max, regen: Math.max(1, Math.round(between(small, NATURE[k].regen) * b.share[k])) };
      }
      const name = names.splice(Math.floor(small() * names.length), 1)[0] || `${b.label} ${i + 1}`;
      const reserve = Object.fromEntries(SOIL.map((k) => [k, nature[k].max]));
      out.push({ id: `${kind[0]}${i}`, name, x: c.x, y: c.y, nature, reserve, kind, places: pick(small, b.places) });
    }
  }
  for (const w of out) w.climate = climateAt(sun, w);
  return out;
}

export const sameCell = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;

// ---------------------------------------------------------------------------
// Place sur les planètes
// ---------------------------------------------------------------------------
//
// Chaque niveau de bâtiment occupe une place. Une planète a de 12 à 22
// places, un astéroïde ou une comète bien moins. Les planètes d'avant la
// place n'ont pas de limite.

/** Places occupées : un niveau de bâtiment, une place. */
export const usedPlaces = (levels) => Object.values(levels || {}).reduce((t, n) => t + (Number(n) || 0), 0);

/** Places encore libres (Infinity pour une planète d'avant la place). */
export const placesLeft = (planet) => (Number.isFinite(planet.places) ? planet.places - usedPlaces(planet.levels) : Infinity);
