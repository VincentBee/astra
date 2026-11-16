import { sameCell, UNIVERSE, sunFor, seeded } from '../../../regles/game/index.js';
import { START_RING } from '../../constantes/start-ring.js';

/**
 * Case de départ d'un joueur. Ceux qui étaient prêts au départ sont répartis à égale distance
 * les uns des autres sur un cercle de START_RING cases autour du soleil (même chance pour
 * tous) ; un retardataire tombe sur ce cercle à un endroit tiré de son identifiant. Jamais
 * sur une planète : on glisse le long du cercle jusqu'à une case vide.
 */
export function startCell(p, start) {
  const sun = sunFor(this.state.gid);
  const mid = { x: sun.x + sun.size / 2, y: sun.y + sun.size / 2 };
  const first = Object.values(this.state.players)
    .filter((o) => Number.isFinite(o.ready) && o.ready <= start)
    .sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
  const i = first.findIndex((o) => o.id === p.id);
  const k = i >= 0 ? seeded(`${this.state.gid}/depart`)() + i / first.length : seeded(`${this.state.gid}/depart/${p.id}`)();
  const clamp = (v, hi) => Math.min(hi - 1, Math.max(0, v));
  let cell = null;
  for (let step = 0; step < 32; step++) {
    // 0, +1, −1, +2, −2… crans de 1/64 de tour.
    const a = 2 * Math.PI * (k + (step % 2 ? 1 : -1) * Math.ceil(step / 2) / 64);
    cell = { x: clamp(Math.floor(mid.x + START_RING * Math.cos(a)), UNIVERSE.w), y: clamp(Math.floor(mid.y + START_RING * Math.sin(a)), UNIVERSE.h) };
    if (!this.planets.some((w) => sameCell(w, cell))) break;
  }
  return cell;
}
