import { etat } from '../etat.js';
import { seek } from './seek.js';

/** Glisser jusqu'à `time` : la lecture attend qu'on lâche. */
export function scrub(time) {
  if (etat.playing) {
    etat.resume = true;
    etat.playing = false;
    cancelAnimationFrame(etat.raf);
  }
  seek(time);
}
