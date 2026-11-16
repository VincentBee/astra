import { etat } from '../etat.js';
import { stopMap } from './stop-map.js';

export function stopGame() {
  stopMap();
  clearInterval(etat.liveTimer);
  etat.liveTimer = null;
  etat.wakeLock?.release?.().catch(() => {});
  etat.wakeLock = null;
}
