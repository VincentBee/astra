import { etat } from '../etat.js';

export function stopMap() {
  if (etat.mapFrame) cancelAnimationFrame(etat.mapFrame);
  etat.mapFrame = null;
}
