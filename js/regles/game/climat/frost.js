/**
 * Le soleil s'éteint. `delayMs` après le début de la course, le froid part
 * du coin le plus loin et se resserre vers le soleil, qu'il atteint
 * `durationMs` plus tard. Une planète que le froid atteint est perdue :
 * il faut migrer vers le centre, où il y a de moins en moins de place.
 * `ease` > 1 : il avance lentement au début, puis de plus en plus vite.
 */
export const FROST = { delayMs: 12 * 60_000, durationMs: 24 * 60_000, ease: 2 };
