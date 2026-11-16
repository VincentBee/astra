import { etat } from './etat.js';
import { skyMode } from './sky-mode.js';
import { start } from './start.js';

export function startGalaxy() {
  etat.stop?.();
  etat.stop = start(skyMode());
}
