import { curve } from '../outils/curve.js';
import { lv } from '../outils/lv.js';
import { capsFor } from '../ressources/caps-for.js';
import { space } from './space.js';

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
