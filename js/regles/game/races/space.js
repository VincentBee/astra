import { curve } from '../outils/curve.js';
import { lv } from '../outils/lv.js';

/** Énergie consommée par le labo et le chantier naval (toutes races). */
export const space = (levels) => curve(5, lv(levels, 'lab')) + curve(5, lv(levels, 'yard'));
