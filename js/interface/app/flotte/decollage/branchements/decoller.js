import { renderPick } from '../../../carte/fiche/render-pick.js';
import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { showView } from '../../../partie/show-view.js';
import { renderFleetInfo } from '../../pilotage/render-fleet-info.js';
import { fleetChoice } from '../fleet-choice.js';

$('btn-fleet-go').onclick = () => {
  const { ships, cargo } = fleetChoice();
  const id = etat.session.takeOff(etat.fleetKey, ships, cargo, Math.floor(Number($('fleet-fuel').value) || 0));
  if (!id) return;
  $('sheet-fleet').hidden = true;
  // Direction la carte, flotte sélectionnée : il ne reste qu'à toucher une case.
  etat.selFleet = id;
  etat.selected = null;
  showView('map');
  renderPick();
  renderFleetInfo();
};
