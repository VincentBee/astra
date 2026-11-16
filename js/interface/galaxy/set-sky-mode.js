import { etat } from './etat.js';
import { KEY } from './key.js';
import { SKY_MODES } from './sky-modes.js';
import { start } from './start.js';

/** Change le fond tout de suite et retient le choix. */
export function setSkyMode(mode) {
  if (!SKY_MODES.includes(mode)) return;
  try {
    localStorage.setItem(KEY, mode);
  } catch {}
  etat.stop?.();
  etat.stop = start(mode);
}
