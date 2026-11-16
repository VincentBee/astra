import { stateAt } from './state-at.js';

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
