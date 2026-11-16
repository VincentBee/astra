import { etat } from '../etat.js';
import { RETELL } from '../retell.js';

export function report(ok) {
  if (ok) etat.told = -Infinity;
  else if (Date.now() - etat.told >= RETELL) {
    try {
      if (etat.failed?.() !== false) etat.told = Date.now();
    } catch {}
  }
  return ok;
}
