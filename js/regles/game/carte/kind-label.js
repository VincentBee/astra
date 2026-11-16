import { SMALL_BODIES } from './small-bodies.js';

/** « Planète », « Astéroïde » ou « Comète ». */
export const kindLabel = (kind) => SMALL_BODIES[kind]?.label || 'Planète';
