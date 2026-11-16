import { fleetPos } from '../../../regles/fleet/index.js';

/** Une flotte est-elle visible de mon téléphone ? (les miennes, toujours) */
export function sees(owner, f, now, eyes = this.eyes(now)) {
  if (owner?.id === this.me) return true;
  if (this.fleetDeadAt(owner, f, now) <= now) return false; // détruite par le froid ou au combat (D-163), même si sa fiche ne le dit pas encore
  // Joueur éliminé : ses flottes ont disparu avec lui (D-180), même si sa fiche, hors ligne, en montre encore.
  const dead = this.deadAt(owner, now);
  if (dead != null && dead <= now) return false;
  return this.seesCell(fleetPos(f, now), now, eyes);
}
