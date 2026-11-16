import { RES_INFO } from './res-info.js';
import { RES_PATHS } from './res-paths.js';

/** Icône SVG d'une ressource (ou de la population, 'pop'), à insérer en HTML : nommée pour les lecteurs d'écran. */
export const resIcon = (r, name = RES_INFO[r]?.name) =>
  `<svg class="ri ri-${r}" viewBox="0 0 24 24" role="img" aria-label="${name}"><title>${name}</title><path d="${RES_PATHS[r]}"/></svg>`;
