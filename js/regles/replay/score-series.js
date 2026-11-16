import { ficheScore } from './fiche-score.js';
import { planetsFor } from '../game/index.js';

/**
 * Courbe des points de chaque joueur pendant la partie : { pid: [{ t, pts }] }, un point à
 * chaque entrée de son journal où ses points changent (et la première).
 */
export function scoreSeries(frames, gid) {
  const world = planetsFor(gid);
  const out = {};
  for (const f of frames) {
    const pts = ficheScore(f.fiche, world);
    const line = (out[f.pid] ||= []);
    if (!line.length || line[line.length - 1].pts !== pts) line.push({ t: f.t, pts });
  }
  return out;
}
