import { RACE_PATHS } from './race-paths.js';
import { RACES } from './races.js';

/** Icône SVG d'une race, à insérer en HTML : nommée pour les lecteurs d'écran. */
export const raceIcon = (r) =>
  `<svg class="rci" viewBox="0 0 24 24" role="img" aria-label="${RACES[r].name}"><title>${RACES[r].name}</title><path d="${RACE_PATHS[r]}"/></svg>`;
