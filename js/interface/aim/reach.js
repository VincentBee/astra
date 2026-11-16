import { FINGER } from './finger.js';
import { MIN_REACH } from './min-reach.js';

/** Portée du doigt en cases, pour une case de `px` pixels CSS. */
export const reach = (px) => Math.max(MIN_REACH, FINGER / Math.max(1e-9, px));
