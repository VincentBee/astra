import { esc } from '../outils/esc.js';

/**
 * Tête d'une carte compacte : le nom (qu'on touche pour voir la description)
 * et un niveau ou un état à côté.
 */
export const cardHead = (name, attr) =>
  `<div class="b-head"><button class="b-name" aria-expanded="false" title="Afficher le détail">${esc(name)}</button><span class="level mono" ${attr}></span></div>`;
