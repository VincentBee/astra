import { sameCell } from '../../../regles/game/index.js';

/**
 * La planète `w` est-elle déjà à un autre joueur installé avant l'heure
 * `at` (départagé comme ownerAt, par identifiant à égalité) ?
 */
export function takenBefore(w, at) {
  const owner = this.ownerAt(w);
  if (!owner || owner.id === this.me) return !!owner;
  const t = sameCell(owner.home, w) ? owner.claimAt || owner.rank || 0 : owner.colonies?.[w.id]?.claimAt || 0;
  return t < at || (t === at && owner.id < this.me);
}
