import { SPEED } from '../temps/speed.js';
import { RACES } from '../races/races.js';

/**
 * Problèmes vitaux d'une planète, à partir de `stateAt` : nourriture et énergie
 * (les minéraux ne tuent personne). `short` : la demande n'est plus couverte
 * (famine, panne) ; `deficit` : le stock baisse, `left` = millisecondes réelles
 * avant qu'il soit vide. Les pénuries d'abord.
 */
export function planetAlerts(race, s) {
  const f = s.prod;
  const out = [];
  for (const res of ['food', 'energy']) {
    if (!RACES[race].resources.includes(res)) continue;
    const eff = res === 'food' ? f.effF : f.effE;
    if (eff < 1) out.push({ res, kind: 'short', eff });
    else if (f.net[res] < -0.5) out.push({ res, kind: 'deficit', left: (s.stock[res] / -f.net[res]) * 3_600_000 / SPEED });
  }
  return out.sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'short' ? -1 : 1));
}
