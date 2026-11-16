import { sameCell } from '../../../game.js';

/**
 * Toutes les planètes d'un joueur : sa planète mère (clé « home ») et ses
 * colonies (clé = identifiant de la planète de l'univers).
 * [{ key, planet, cell, name }]
 */
export function planetsOf(p) {
  if (!p) return [];
  const out = [];
  if (p.planet && p.home) {
    const w = this.planets.find((x) => sameCell(x, p.home));
    out.push({ key: 'home', planet: p.planet, cell: p.home, name: w?.name || 'Planète mère' });
  }
  for (const [id, planet] of Object.entries(p.colonies || {})) {
    const w = this.planets.find((x) => x.id === id);
    if (w) out.push({ key: id, planet, cell: { x: w.x, y: w.y }, name: w.name });
  }
  return out;
}
