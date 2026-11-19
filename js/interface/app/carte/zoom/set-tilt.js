import { BASSIN } from '../bassin/bassin.js';
import { zoom } from './zoom.js';

/** Incline la vue (D-562), entre la vue de dessus et `BASSIN.tiltMax` ; retenue sur ce téléphone. */
export function setTilt(t) {
  zoom.t = Math.min(BASSIN.tiltMax, Math.max(BASSIN.tiltMin, Number.isFinite(t) ? t : BASSIN.tilt));
  try {
    localStorage.setItem('astra.tilt', String(Math.round(zoom.t * 1000) / 1000));
  } catch {}
}
