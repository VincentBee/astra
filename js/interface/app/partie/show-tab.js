import { $ } from '../outils/dollar.js';

/** Onglet de l'écran planète : bâtiments, pouvoirs (aliens), recherche ou flottes. */
export function showTab(tab) {
  $('view-planet').dataset.tab = tab;
  for (const b of document.querySelectorAll('[data-tab-btn]')) {
    b.setAttribute('aria-selected', String(b.dataset.tabBtn === tab));
    b.tabIndex = b.dataset.tabBtn === tab ? 0 : -1;
  }
}
