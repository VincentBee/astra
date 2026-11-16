import { TECHS } from './techs.js';

/** Technologie et niveau qui débloquent un vaisseau. */
export function shipUnlock(race, type) {
  for (const [k, t] of Object.entries(TECHS[race])) if (t.unlock?.[type]) return { key: k, level: t.unlock[type] };
  return null;
}
