import { etat } from '../../etat.js';
import { renderPick } from '../fiche/render-pick.js';
import { closeMenu } from '../menu/close-menu.js';

/** La fiche d'une planète de la carte. */
export function showPlanet(w) {
  closeMenu();
  etat.selected = { x: w.x, y: w.y };
  renderPick();
}
