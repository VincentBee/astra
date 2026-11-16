import { KEY } from './key.js';
import { SKY_MODES } from './sky-modes.js';

/** Le réglage choisi (fixe par défaut, et à la place de l'ancien « anime »). */
export function skyMode() {
  try {
    const m = localStorage.getItem(KEY);
    if (SKY_MODES.includes(m)) return m;
  } catch {}
  return 'fixe';
}
