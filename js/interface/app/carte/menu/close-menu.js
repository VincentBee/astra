import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

export function closeMenu() {
  if (!etat.menu) return;
  etat.menu = null;
  $('map-menu').hidden = true;
}
