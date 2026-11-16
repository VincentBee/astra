import { stateAt } from './state-at.js';
import { AUTO_CHUNKS } from '../plan/auto-chunks.js';
import { write } from './write.js';

/**
 * Version « solde » : écrit l'état courant dans la planète (par son
 * propriétaire uniquement). Renvoie ce qui s'est terminé ou lancé (fil de
 * construction) entre-temps : [{ kind: 'queue' | 'research' | 'yard' | 'start', ... }].
 */
export function settle(planet, now) {
  // Une heure qui recule (ou invalide) ne doit pas faire recompter la production déjà comptée.
  if (!Number.isFinite(now)) return [];
  now = Math.max(now, planet.at || 0);
  // Règle d'achat automatique pleine (AUTO_MAX lots) avant `now` : on écrit jusqu'au dernier lot
  // compté, puis on reprend de là (D-531). Le résultat ne dépend que de la fiche et de `now`.
  const done = [];
  for (let k = 0; k < AUTO_CHUNKS; k++) {
    const s = stateAt(planet, now);
    if (s.autoFull === null || s.autoFull >= now || s.autoFull <= planet.at || k === AUTO_CHUNKS - 1) {
      write(planet, s, now);
      return done.concat(s.done);
    }
    const mid = stateAt(planet, s.autoFull);
    write(planet, mid, s.autoFull);
    done.push(...mid.done);
  }
  return done;
}
