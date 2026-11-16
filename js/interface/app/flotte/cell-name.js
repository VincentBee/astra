import { sameCell } from '../../../game.js';
import { mapPlanets } from '../carte/map-planets.js';

/** Nom d'une case : la planète qui s'y trouve, sinon ses coordonnées. */
export const cellName = (cell) => mapPlanets().find((w) => sameCell(w, cell))?.name || `[${Math.round(cell.x)}:${Math.round(cell.y)}]`;
