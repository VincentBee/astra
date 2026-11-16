import { SHIPS } from '../tech/index.js';

/** Caractéristiques d'un vaisseau dans le déroulé : celles de sa race, technologies comprises. */
export function statsOf(s, k) {
  if (k === 'fort') return s.fort || { attack: 0, hull: 0 };
  const base = SHIPS[s.race]?.[k] || { attack: 0, hull: 0 };
  return { attack: base.attack * s.bonus.attack, hull: base.hull * s.bonus.hull };
}
