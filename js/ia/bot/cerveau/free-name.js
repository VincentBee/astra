import { NAMES } from '../donnees/names.js';

/** Premier nom d'IA hors de `used` (« IA Véga »… puis « IA 9 », « IA 10 »…). */
export function freeName(used) {
  let n = NAMES.length + 1;
  while (used.has(`IA ${n}`)) n++;
  return NAMES.find((x) => !used.has(x)) || `IA ${n}`;
}
