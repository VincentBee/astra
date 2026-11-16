import { lv } from '../outils/lv.js';
import { capsFor } from '../ressources/caps-for.js';
import { LIFT_PER_PSI } from './lift-per-psi.js';

export function liftGain(planet, amp = 1 + 0.25 * lv(planet.levels, 'amplifier')) {
  const soil = planet.nature?.minerals ? planet.reserve.minerals : Infinity;
  const cap = capsFor(planet.levels).minerals;
  const before = planet.stock.minerals;
  return Math.max(0, Math.min(Math.max(cap, before), before + Math.min(soil, LIFT_PER_PSI * planet.pop * amp)) - before);
}
