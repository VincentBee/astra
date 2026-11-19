import { loadRelief } from './load-relief.js';
import { RELIEF_KEY } from './relief-key.js';
import { reliefNote } from './relief-note.js';
import { relief } from './relief.js';

/** Coche ou décoche « Carte en 3D » (D-563) : retenu sur ce téléphone ; cochée, le module se télécharge. */
export function setRelief(on) {
  relief.on = !!on;
  try {
    if (relief.on) localStorage.setItem(RELIEF_KEY, '1');
    else localStorage.removeItem(RELIEF_KEY);
  } catch {}
  if (relief.on) loadRelief();
  reliefNote();
}
