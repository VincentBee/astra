import { fmt } from '../../../regles/game/index.js';

/** Solde par minute réelle, signé (un débit par heure de jeu se multiplie par TEMPO). */
export function rateText(v) {
  const n = Math.round(v);
  if (n === 0) return '±0 / min';
  return `${n > 0 ? '+' : '−'}${fmt(Math.abs(n))} / min`;
}
