import { ic } from './ic.js';

/** Remplace dans le HTML statique chaque <i data-ic="nom"></i> par son icône. */
export function fillIcons(root = document) {
  for (const el of root.querySelectorAll('i[data-ic]')) el.outerHTML = ic(el.dataset.ic);
}
