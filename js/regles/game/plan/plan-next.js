import { flows } from '../economie/flows.js';
import { planLane } from './plan-lane.js';
import { planNeed } from './plan-need.js';
import { starved } from './starved.js';

/**
 * Éléments du fil à attendre, dans l'ordre du fil : le premier dont le
 * chantier est libre et qui peut partir. Un élément dont le chantier est
 * occupé, ou à qui il manque un prérequis, garde sa place sans bloquer les
 * autres chantiers (mais bloque ceux de son chantier qui le suivent). Le
 * premier élément prêt a la priorité sur le stock : ceux d'après attendent
 * qu'il soit lancé (on ne double pas dans le fil pour une question de prix).
 *
 * Sauf (D-270) un élément prêt qu'on ne pourra pas payer avec la production
 * actuelle (`starved` : famine, panne, solde nul) : il ne bloque personne, pas
 * même son propre chantier, mais il reste candidat. On rend la liste de ces
 * éléments-là, suivie du premier élément prêt payable un jour ; `until` lance
 * le premier de la liste que le stock couvre. Sans famine ni panne, la liste
 * n'a qu'un élément : le calcul est celui d'avant. null si rien n'est prêt.
 */
export function planNext(race, places, s, q, plan, auto = null) {
  const waiting = new Set();
  const late = [];
  const f = () => flows(race, s.levels, s.pop, s.stock, 1 / 3600, 1, s.nature, s.reserve, s.tech, s.climate);
  for (let pos = 0; pos < plan.length; pos++) {
    const lane = planLane(plan[pos].item);
    if (q[lane] || waiting.has(lane)) {
      waiting.add(lane);
      continue;
    }
    const need = planNeed(race, places, s, plan[pos].item);
    if (need.why) {
      waiting.add(lane);
      continue;
    }
    const pick = { pos, lane, ...need };
    if (starved(need.cost, s.stock, f)) {
      late.push(pick);
      continue;
    }
    return [...late, pick];
  }
  // La règle automatique (D-530), après tout le fil : chantier naval libre et aucun lot au fil.
  if (auto && !q.yard && !plan.some((x) => planLane(x.item) === 'yard')) {
    const need = planNeed(race, places, s, auto);
    if (!need.why) {
      const pick = { lane: 'yard', auto: true, ...need };
      if (!starved(need.cost, s.stock, f)) return [...late, pick];
      late.push(pick);
    }
  }
  return late.length ? late : null;
}
