import { MIN } from '../constantes/min.js';

export function elapsedText(ms) {
  const m = Math.floor(ms / MIN);
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return `+${d ? `${d} j ` : ''}${h} h ${String(m % 60).padStart(2, '0')}`;
}
