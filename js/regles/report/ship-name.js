import { SHIPS } from '../tech/index.js';

/** Nom d'un vaisseau de la race (ou « défense de la planète »). */
export function shipName(race, k) {
  if (k === 'fort') return 'défense de la planète';
  return SHIPS[race]?.[k]?.name || k;
}
