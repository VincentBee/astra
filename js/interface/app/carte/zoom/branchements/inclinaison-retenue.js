import { TILT } from '../tilt.js';
import { zoom } from '../zoom.js';

// L'inclinaison choisie la dernière fois sur ce téléphone (D-562), sinon celle de départ.
try {
  const t = parseFloat(localStorage.getItem('astra.tilt'));
  if (Number.isFinite(t)) zoom.t = Math.min(TILT.max, Math.max(TILT.min, t));
} catch {}
