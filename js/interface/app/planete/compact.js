import { fmt } from '../../../regles/game/index.js';

/** « 118 k » au-delà de 100 000 : un nombre qui tient dans une tuile étroite. */
export const compact = (v) => (v >= 1e5 ? `${fmt(Math.floor(v / 1000))} k` : fmt(v));
