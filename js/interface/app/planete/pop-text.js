import { fmt, RACES, resIcon } from '../../../regles/game/index.js';

/** Résumé d'une planète pour la liste des commandants. */
export function popText(race, pop) {
  const R = RACES[race];
  if (!R.pop) return null;
  return `<span class="qty">${fmt(Math.floor(pop))}${resIcon('pop', R.pop.label)}</span>`;
}
