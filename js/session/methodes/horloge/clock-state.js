import { CLOCK_DRIFT_MS } from '../../constantes/clock-drift-ms.js';

/** Heure d'un joueur relié : 'ok', 'wait' (pas encore mesurée) ou 'drift' (elle a changé). */
export function clockState(link) {
  if (!link || link.local || link.noClock) return 'ok';
  if (!Number.isFinite(link.skew) || (link.skews?.length || 0) < 3) return 'wait';
  return Math.abs(this.clockDrift(link)) > CLOCK_DRIFT_MS ? 'drift' : 'ok';
}
