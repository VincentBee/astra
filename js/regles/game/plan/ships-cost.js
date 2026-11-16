import { SHIPS } from '../../tech/index.js';

/** Prix d'un lot de `n` vaisseaux. */
export const shipsCost = (race, type, n) => Object.fromEntries(Object.entries(SHIPS[race][type].cost).map(([r, v]) => [r, v * n]));
