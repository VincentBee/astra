// Technologies et vaisseaux de chaque race : données pures, sans réseau ni DOM.
//
// Chaque race a son propre arbre de recherche (une technologie demande un
// niveau de labo et, souvent, une autre technologie) et sa propre flotte :
// un cargo, un vaisseau colonisateur, un chasseur et un vaisseau lourd, qui
// lui ressemblent. Les humains sont polyvalents, les machines bon marché,
// rapides et fragiles, les aliens chers, lents et redoutables.
//
// Effets des technologies, par niveau : `bonus` ajoute une part (0,1 = +10 %)
// à l'extraction de minéraux, à la nourriture, à l'énergie produite, ou aux
// vaisseaux (vitesse, attaque, coque). `unlock` débloque un vaisseau à partir
// d'un niveau.

export const TECHS = {
  human: {
    forage: {
      name: 'Forage profond',
      desc: '+10 % de minéraux extraits par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 150 },
      bonus: { minerals: 0.1 },
    },
    agro: {
      name: 'Agronomie',
      desc: '+10 % de nourriture par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 120 },
      bonus: { food: 0.1 },
    },
    propulsion: {
      name: 'Propulsion chimique',
      desc: 'Débloque le cargo. +10 % de vitesse des vaisseaux par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 200 },
      bonus: { speed: 0.1 },
      unlock: { cargo: 1 },
    },
    blindage: {
      name: 'Blindage composite',
      desc: 'Débloque la frégate. +10 % de coque par niveau.',
      max: 5,
      req: { lab: 2, propulsion: 1 },
      base: { minerals: 300 },
      bonus: { hull: 0.1 },
      unlock: { fighter: 1 },
    },
    armement: {
      name: 'Canons à masse',
      desc: '+10 % d’attaque par niveau. Le croiseur au niveau 2.',
      max: 5,
      req: { lab: 2, blindage: 1 },
      base: { minerals: 400 },
      bonus: { attack: 0.1 },
      unlock: { heavy: 2 },
    },
    colonies: {
      name: 'Arches coloniales',
      desc: 'Débloque l’arche, qui fonde une colonie sur une planète libre.',
      max: 1,
      req: { lab: 3, propulsion: 2 },
      base: { minerals: 800 },
      unlock: { colony: 1 },
    },
  },

  machine: {
    quantique: {
      name: 'Forage quantique',
      desc: '+10 % de minéraux extraits par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 150, energy: 50 },
      bonus: { minerals: 0.1 },
    },
    supra: {
      name: 'Supraconducteurs',
      desc: '+10 % d’énergie produite par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 150, energy: 40 },
      bonus: { energy: 0.1 },
    },
    ions: {
      name: 'Propulseurs ioniques',
      desc: 'Débloque le drone-cargo. +10 % de vitesse par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 180, energy: 60 },
      bonus: { speed: 0.1 },
      unlock: { cargo: 1 },
    },
    essaim: {
      name: 'Intelligence d’essaim',
      desc: 'Débloque le drone d’assaut. +10 % d’attaque par niveau.',
      max: 5,
      req: { lab: 2, ions: 1 },
      base: { minerals: 280, energy: 100 },
      bonus: { attack: 0.1 },
      unlock: { fighter: 1 },
    },
    coque: {
      name: 'Coque nanométrique',
      desc: '+10 % de coque par niveau. Le destroyer au niveau 2.',
      max: 5,
      req: { lab: 2, essaim: 1 },
      base: { minerals: 380, energy: 140 },
      bonus: { hull: 0.1 },
      unlock: { heavy: 2 },
    },
    replication: {
      name: 'Réplication autonome',
      desc: 'Débloque la sonde réplicatrice, qui fonde une colonie.',
      max: 1,
      req: { lab: 3, ions: 2 },
      base: { minerals: 700, energy: 250 },
      unlock: { colony: 1 },
    },
  },

  alien: {
    symbiose: {
      name: 'Symbiose',
      desc: '+10 % de nourriture par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 120, food: 40 },
      bonus: { food: 0.1 },
    },
    echo: {
      name: 'Écho tellurique',
      desc: '+10 % de minéraux arrachés au sol par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 160, food: 50 },
      bonus: { minerals: 0.1 },
    },
    levitation: {
      name: 'Lévitation',
      desc: 'Débloque la méduse porteuse. +10 % de vitesse par niveau.',
      max: 5,
      req: { lab: 1 },
      base: { minerals: 200, food: 60 },
      bonus: { speed: 0.1 },
      unlock: { cargo: 1 },
    },
    dard: {
      name: 'Dard psionique',
      desc: 'Débloque le dard. +10 % d’attaque par niveau.',
      max: 5,
      req: { lab: 2, levitation: 1 },
      base: { minerals: 300, food: 90 },
      bonus: { attack: 0.1 },
      unlock: { fighter: 1 },
    },
    carapace: {
      name: 'Carapace chitineuse',
      desc: '+10 % de coque par niveau. Le léviathan au niveau 2.',
      max: 5,
      req: { lab: 2, dard: 1 },
      base: { minerals: 420, food: 130 },
      bonus: { hull: 0.1 },
      unlock: { heavy: 2 },
    },
    ponte: {
      name: 'Ponte astrale',
      desc: 'Débloque la graine-ruche, qui fonde une colonie.',
      max: 1,
      req: { lab: 3, levitation: 2 },
      base: { minerals: 750, food: 220 },
      unlock: { colony: 1 },
    },
  },
};

/**
 * Vaisseaux, par race. `attack` et `hull` (points de coque) servent au
 * combat, `cargo` à transporter des ressources, `speed` en cases par minute.
 * Carburant (de l'énergie) : `burn` par case parcourue, `tank` la contenance
 * du réservoir. Un plein mène à 40 cases (humains), 30 (machines, sobres
 * mais à courte portée) ou 50 (aliens, gourmands mais endurants).
 */
export const SHIPS = {
  human: {
    cargo: { name: 'Cargo Hermès', attack: 0, hull: 20, cargo: 500, speed: 6, burn: 1, tank: 40, cost: { minerals: 150 } },
    colony: { name: 'Arche coloniale', attack: 0, hull: 40, cargo: 300, speed: 4, burn: 2, tank: 80, cost: { minerals: 600 } },
    fighter: { name: 'Frégate', attack: 12, hull: 30, cargo: 50, speed: 7, burn: 1, tank: 40, cost: { minerals: 200 } },
    heavy: { name: 'Croiseur', attack: 40, hull: 120, cargo: 150, speed: 5, burn: 3, tank: 120, cost: { minerals: 700 } },
  },
  machine: {
    cargo: { name: 'Drone-cargo', attack: 0, hull: 12, cargo: 400, speed: 8, burn: 0.5, tank: 15, cost: { minerals: 100, energy: 40 } },
    colony: { name: 'Sonde réplicatrice', attack: 0, hull: 25, cargo: 200, speed: 6, burn: 1.5, tank: 45, cost: { minerals: 450, energy: 150 } },
    fighter: { name: 'Drone d’assaut', attack: 9, hull: 15, cargo: 20, speed: 9, burn: 0.5, tank: 15, cost: { minerals: 110, energy: 50 } },
    heavy: { name: 'Destroyer', attack: 35, hull: 90, cargo: 100, speed: 6, burn: 1.5, tank: 45, cost: { minerals: 550, energy: 200 } },
  },
  alien: {
    cargo: { name: 'Méduse porteuse', attack: 0, hull: 35, cargo: 450, speed: 5, burn: 1.5, tank: 75, cost: { minerals: 180, food: 60 } },
    colony: { name: 'Graine-ruche', attack: 0, hull: 60, cargo: 250, speed: 4, burn: 3, tank: 150, cost: { minerals: 650, food: 200 } },
    fighter: { name: 'Dard', attack: 18, hull: 40, cargo: 30, speed: 7, burn: 2, tank: 100, cost: { minerals: 260, food: 80 } },
    heavy: { name: 'Léviathan', attack: 60, hull: 200, cargo: 200, speed: 4, burn: 5, tank: 250, cost: { minerals: 1000, food: 300 } },
  },
};

/** Ordre d'affichage des vaisseaux. */
export const SHIP_KEYS = ['cargo', 'fighter', 'heavy', 'colony'];

const lvOf = (tech, k) => tech?.[k] || 0;

/** Multiplicateurs (1 = sans effet) donnés par les technologies d'un joueur. */
export function techBonus(race, tech) {
  const out = { minerals: 1, food: 1, energy: 1, speed: 1, attack: 1, hull: 1 };
  for (const [k, t] of Object.entries(TECHS[race] || {})) {
    for (const [b, v] of Object.entries(t.bonus || {})) out[b] += v * lvOf(tech, k);
  }
  return out;
}

/** Coût du niveau suivant d'une technologie (de `level` à `level` + 1). */
export function techCost(race, key, level) {
  const t = TECHS[race][key];
  const m = Math.pow(1.7, level);
  const out = {};
  for (const [r, v] of Object.entries(t.base)) out[r] = Math.floor(v * m);
  return out;
}

/** Durée de recherche en ms : plus courte avec un labo plus grand. */
export function researchDuration(cost, labLevel) {
  const total = Object.values(cost).reduce((a, b) => a + b, 0);
  return Math.max(8, Math.round(total / (20 * (1 + 0.5 * Math.max(0, labLevel - 1))))) * 1000;
}

/** Ce qui manque pour rechercher une technologie, en clair, ou null si rien. */
export function techMissing(race, key, tech, labLevel) {
  const t = TECHS[race][key];
  const miss = [];
  for (const [k, need] of Object.entries(t.req)) {
    if (k === 'lab') {
      if (labLevel < need) miss.push(`labo niv. ${need}`);
    } else if (lvOf(tech, k) < need) miss.push(`${TECHS[race][k].name} ${need}`);
  }
  return miss.length ? miss.join(', ') : null;
}

/** Technologie et niveau qui débloquent un vaisseau. */
export function shipUnlock(race, type) {
  for (const [k, t] of Object.entries(TECHS[race])) if (t.unlock?.[type]) return { key: k, level: t.unlock[type] };
  return null;
}

export function shipUnlocked(race, type, tech) {
  const u = shipUnlock(race, type);
  return !!u && lvOf(tech, u.key) >= u.level;
}

/** Caractéristiques d'un vaisseau, technologies comprises. */
export function shipStats(race, type, tech) {
  const s = SHIPS[race][type];
  const b = techBonus(race, tech);
  return { ...s, attack: s.attack * b.attack, hull: s.hull * b.hull, speed: s.speed * b.speed };
}

/** Durée de construction d'un lot de vaisseaux, en ms : plus courte avec un chantier plus grand. */
export function shipDuration(race, type, count, yardLevel) {
  const c = SHIPS[race][type].cost;
  const total = Object.values(c).reduce((a, b) => a + b, 0) * count;
  return Math.max(6, Math.round(total / (30 * (1 + 0.5 * Math.max(0, yardLevel - 1))))) * 1000;
}
