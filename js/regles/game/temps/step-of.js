import { TEMPO } from '../../tech/index.js';
import { MAX_STEPS } from './max-steps.js';

/**
 * Durée d'un pas pour un calcul de `total` ms : 1 s au moins, 2 h de jeu au plus
 * (de plus grands pas changeaient la population), 300 pas sous 4 h ; au-delà de
 * MAX_STEPS pas de 2 h de jeu, les pas s'allongent pour rester à MAX_STEPS.
 */
export const stepOf = (total) => Math.max(1000, Math.min(120_000 / TEMPO, total / 300), total / MAX_STEPS);
