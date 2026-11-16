import { KEYS } from './keys.js';
import { shipName } from './ship-name.js';

/** « 3 × Frégate et la défense de la planète » (vide si rien). */
export function listShips(race, o) {
  const parts = KEYS.filter((k) => o?.[k] > 0).map((k) => (k === 'fort' ? 'sa défense' : `${o[k]} × ${shipName(race, k)}`));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}` : parts[0] || '';
}
