import { etat } from '../../../etat.js';
import { openFleetSheet } from '../../../flotte/decollage/open-fleet-sheet.js';
import { $ } from '../../../outils/dollar.js';
import { renderPick } from '../render-pick.js';

$('btn-pi-takeoff').onclick = (e) => {
  const key = e.currentTarget.dataset.key || 'home';
  etat.selected = null; // la fiche de la planète se ferme, le formulaire de décollage prend sa place
  renderPick();
  openFleetSheet(key);
};
