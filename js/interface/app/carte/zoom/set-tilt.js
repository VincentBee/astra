import { TILT } from './tilt.js';
import { zoom } from './zoom.js';

/** Incline la vue (D-562), entre la vue de dessus et `TILT.max` ; retenue sur ce téléphone. */
export function setTilt(t) {
  zoom.t = Math.min(TILT.max, Math.max(TILT.min, Number.isFinite(t) ? t : TILT.start));
  try {
    localStorage.setItem('astra.tilt', String(Math.round(zoom.t * 1000) / 1000));
  } catch {}
}
