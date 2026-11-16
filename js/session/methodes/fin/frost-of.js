import { frostAt, sunFor } from '../../../game.js';

/** Heure à laquelle le froid prend la case `cell` (Infinity : partie sans froid). */
export function frostOf(cell) {
  const start = this.startedAt;
  if (start == null) return Infinity;
  if (this.sunCache?.gid !== this.state.gid) this.sunCache = { gid: this.state.gid, sun: sunFor(this.state.gid) };
  return frostAt(this.sunCache.sun, start, cell);
}
