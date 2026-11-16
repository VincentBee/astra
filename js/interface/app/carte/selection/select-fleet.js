import { etat } from '../../etat.js';
import { renderFleetInfo } from '../../flotte/pilotage/render-fleet-info.js';
import { renderMapFleets } from '../../flotte/pilotage/render-map-fleets.js';
import { renderPick } from '../fiche/render-pick.js';
import { closeMenu } from '../menu/close-menu.js';

/** Sélectionne une de mes flottes pour la piloter (ou la relâche, `id` nul). */
export function selectFleet(id) {
  etat.selFleet = id;
  closeMenu();
  if (id) etat.selected = null;
  renderPick();
  renderFleetInfo();
  renderMapFleets();
}
