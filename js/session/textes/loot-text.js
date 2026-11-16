import { RES_INFO } from '../../game.js';

/** « 173 minéraux et 37 nourriture » (vide si rien). */
export function lootText(take) {
  const parts = Object.entries(take)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `${v} ${RES_INFO[r].name.toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0] || '';
}
