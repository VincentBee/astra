import { RACES } from '../races/races.js';

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
