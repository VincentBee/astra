import { fmt, resIcon } from '../../../regles/game/index.js';

/** « 1 234 ◆ · 30 ⚡ », en HTML : chaque quantité suivie de l'icône de sa ressource. */
export function costText(cost) {
  return Object.entries(cost)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `<span class="qty">${fmt(v)}${resIcon(r)}</span>`)
    .join(' · ');
}
