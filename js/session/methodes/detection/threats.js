import { sameCell } from '../../../regles/game/index.js';
import { countShips, fleetPos, armed } from '../../../regles/fleet/index.js';

/**
 * Flottes armées adverses que je vois (D-133). Celles qui visent une de mes
 * planètes (attaque, conquête, simple trajet vers sa case, ou déjà en
 * orbite) d'abord, la plus proche de l'impact en tête ; puis les autres,
 * de la plus proche à la plus lointaine de mes planètes.
 * [{ p, f, target, eta, dist, n }] : target est la planète visée (ou la
 * plus proche si la flotte n'en vise aucune), eta le temps avant l'arrivée
 * en ms (0 en orbite ; null si elle ne vise rien), n le nombre de vaisseaux.
 */
export function threats(now) {
  const me = this.state.players[this.me];
  const mine = this.planetsOf(me);
  if (!mine.length) return [];
  const eyes = this.eyes(now);
  const out = [];
  for (const p of Object.values(this.state.players)) {
    if (p.id === this.me || this.deadAt(p, now) != null) continue;
    for (const f of this.fleetsOf(p)) {
      if (!armed(p.race, f.ships, p.planet?.tech || {}) || !this.sees(p, f, now, eyes)) continue;
      const pos = fleetPos(f, now);
      const order = f.order;
      // Le résultat d'une frappe peut arriver un peu après l'heure prévue : on garde l'alerte à 0 s en attendant.
      let target = ['attack', 'conquer'].includes(order?.kind) && order.pid === this.me ? mine.find((pl) => pl.key === order.key) : null;
      target ||= mine.find((pl) => sameCell(pl.cell, f.to));
      const dist = (pl) => Math.hypot(pl.cell.x - pos.x, pl.cell.y - pos.y);
      const eta = target ? Math.max(0, f.arrive - now) : null;
      target ||= mine.reduce((a, b) => (dist(b) < dist(a) ? b : a));
      out.push({ p, f, target, eta, dist: dist(target), n: countShips(f.ships) });
    }
  }
  return out.sort((a, b) => (a.eta == null) - (b.eta == null) || (a.eta ?? 0) - (b.eta ?? 0) || a.dist - b.dist);
}
