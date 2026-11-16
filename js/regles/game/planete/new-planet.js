import { RACES } from '../races/races.js';

/**
 * Planète d'un joueur. `world` est la planète de l'univers où il s'installe
 * (voir planetsFor) : ses gisements deviennent ceux du joueur.
 */
export function newPlanet(race, now, world = null) {
  const R = RACES[race];
  const levels = {};
  for (const [k, b] of Object.entries(R.buildings)) levels[k] = b.start;
  return {
    race,
    stock: { ...R.start },
    pop: R.pop ? R.pop.start : 0,
    at: now,
    levels,
    queue: null,
    powers: {},
    ...(world ? { nature: JSON.parse(JSON.stringify(world.nature)), reserve: { ...world.reserve } } : {}),
    ...(world?.climate ? { climate: { ...world.climate } } : {}),
    ...(world?.places ? { places: world.places, kind: world.kind } : {}),
  };
}
