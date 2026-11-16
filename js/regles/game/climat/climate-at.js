import { round2 } from '../outils/round2.js';
import { sunDistance } from './sun-distance.js';

/**
 * Climat d'une case : sa chaleur `heat` (1 au bord du soleil, 0 dans le coin
 * le plus loin) et ce qu'elle fait à la production. Près du soleil, beaucoup
 * d'énergie solaire et un sol volcanique riche en minéraux ; la nourriture
 * pousse mieux en zone tempérée qu'au chaud ou au froid.
 */
export function climateAt(sun, c) {
  const { d, far } = sunDistance(sun, c);
  const heat = round2(Math.min(1, Math.max(0, 1 - d / far)));
  return {
    heat,
    energy: round2(0.8 + 0.4 * heat),
    minerals: round2(0.9 + 0.2 * heat),
    food: round2(1.3 - 1.4 * Math.abs(heat - 0.5)),
  };
}
