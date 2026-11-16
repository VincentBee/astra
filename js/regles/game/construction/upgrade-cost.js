import { RACES } from '../races/races.js';

export function upgradeCost(race, key, level) {
  const b = RACES[race].buildings[key];
  const m = Math.pow(b.factor, level);
  return { minerals: Math.floor(b.base.minerals * m), energy: Math.floor(b.base.energy * m) };
}
