import { clock } from '../../outils/clock.js';
import { etat } from '../../etat.js';
import { shipUnlocked } from '../../../../regles/tech/index.js';
import { tooBig } from '../../../../regles/game/index.js';
import { shipsCost } from '../../../../regles/game/index.js';
import { shipsAffordable } from '../../../../regles/game/index.js';

/** Ce que fait la règle d'achat automatique en ce moment, en clair (D-530). */
export function autoWait(me, s, plan) {
  const rule = s.auto;
  if (s.yard?.auto) return `lot en chantier · ${clock(Math.max(0, s.yard.end - etat.session.now()))}`;
  if (plan.some((x) => x?.ship)) return 'attend : le fil a des vaisseaux, ils passent d’abord';
  if (s.yard) return 'attend que le chantier naval se libère';
  if (!s.levels.yard) return 'attend le chantier naval';
  if (!shipUnlocked(me.race, rule.ship, s.tech)) return 'attend la recherche';
  const big = tooBig(me.race, s.levels, shipsCost(me.race, rule.ship, rule.n));
  if (big) return big;
  // Le stock paie le lot, mais un élément prêt du fil le garde pour lui (le fil passe d'abord).
  if (plan.length && shipsAffordable(me.race, rule.ship, s.stock) >= rule.n) return 'attend : le fil passe d’abord';
  return 'attend les fonds';
}
