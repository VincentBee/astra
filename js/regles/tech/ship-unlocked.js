import { lvOf } from './lv-of.js';
import { shipUnlock } from './ship-unlock.js';

export function shipUnlocked(race, type, tech) {
  const u = shipUnlock(race, type);
  return !!u && lvOf(tech, u.key) >= u.level;
}
