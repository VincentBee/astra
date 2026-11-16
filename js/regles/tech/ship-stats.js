import { SHIPS } from './ships.js';
import { techBonus } from './tech-bonus.js';

/** Caractéristiques d'un vaisseau, technologies comprises. */
export function shipStats(race, type, tech) {
  const s = SHIPS[race][type];
  const b = techBonus(race, tech);
  return { ...s, attack: s.attack * b.attack, hull: s.hull * b.hull, speed: s.speed * b.speed };
}
