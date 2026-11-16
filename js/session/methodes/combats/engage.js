import { inContact, firstContact, fleetPos, aggressive, armed } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';

/**
 * Flotte agressive, à chaque passage : combat contre la flotte ennemie
 * visible la plus proche à son contact (la même règle que la poursuite),
 * puis la flotte reprend son trajet et son ordre. Renvoie true si ma fiche a changé.
 */
export function engage(p, f, now, from = now) {
  if (!aggressive(f) || f.order?.kind === 'chase' || !armed(p.race, f.ships, techOf(p))) return false;
  const eyes = this.eyes(now);
  const pos = fleetPos(f, now);
  let best = null;
  let missed = null; // rencontre que personne n'a regardée à temps (hors ligne) : la plus ancienne
  for (const enemy of Object.values(this.state.players)) {
    if (enemy.id === this.me) continue;
    for (const target of this.fleetsOf(enemy)) {
      if (this.pendingFight(p, f, enemy, target)) continue;
      if (!inContact(f, target, now)) {
        const t = firstContact(f, target, from, now);
        if (t && (!missed || t < missed.t) && this.sees(enemy, target, t)) missed = { enemy, target, t };
        continue;
      }
      if (!this.sees(enemy, target, now, eyes)) continue;
      const t = fleetPos(target, now);
      const d = Math.hypot(t.x - pos.x, t.y - pos.y);
      if (!best || d < best.d) best = { enemy, target, d };
    }
  }
  if (best) return this.fight(p, f, best.enemy, best.target, now, true);
  return missed ? this.fight(p, f, missed.enemy, missed.target, missed.t, true) : false;
}
