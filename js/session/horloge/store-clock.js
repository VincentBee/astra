import { isObj } from '../fiches/is-obj.js';
import { CLOCKS_KEY } from './clocks-key.js';

export function storeClock(gid, c) {
  try {
    let all = JSON.parse(localStorage.getItem(CLOCKS_KEY) || '{}');
    if (!isObj(all)) all = {};
    all[gid] = c;
    all = Object.fromEntries(Object.entries(all).filter(([, v]) => isObj(v)).sort((a, b) => (b[1].at || 0) - (a[1].at || 0)).slice(0, 10));
    localStorage.setItem(CLOCKS_KEY, JSON.stringify(all));
  } catch {
    // stockage plein ou interdit : l'heure commune sera reprise des autres au prochain contact
  }
}
