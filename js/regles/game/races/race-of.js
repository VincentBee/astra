import { RACES } from './races.js';

export const raceOf = (planet) => RACES[planet?.race] || null;
