import { totalLost } from './total-lost.js';

/** Il reste quelque chose à ce camp à la fin (vaisseaux ou défense). */
export function standing(rep, who) {
  const s = rep[who];
  const lost = totalLost(rep, who);
  const before = { ...s.ships, ...(s.fort?.hull > 0 ? { fort: 1 } : {}) };
  return Object.entries(before).some(([k, v]) => v - (lost[k] || 0) > 0);
}
