import { techBonus } from '../../../tech.js';
import { RACES } from '../races/races.js';
import { num } from '../outils/num.js';
import { extract } from './extract.js';

/**
 * Flux sur `h` heures de jeu à partir d'un état. Les rendements `effE`
 * (courant) et `effF` (nourriture) valent 1 tant que le stock suffit ; en
 * pénurie, ils valent la part de la demande couverte. `nature` et `reserve`
 * sont les gisements de la planète (minéraux et nourriture du sol).
 */
export function flows(race, levels, pop, stock, h, boost = 1, nature = null, reserve = null, tech = null, climate = null) {
  const R = RACES[race];
  // Un stock absent ou non numérique compte pour 0 (#76) : sinon tout devient NaN.
  stock = { energy: num(stock.energy), food: num(stock.food) };
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
