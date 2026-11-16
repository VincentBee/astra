import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../../pilotage/render-fleet-info.js';
import { renderMapFleets } from '../../pilotage/render-map-fleets.js';
import { closeShuttleSheet } from '../close-shuttle-sheet.js';

$('btn-shuttle-stop').onclick = () => {
  etat.session.shuttleFleet(etat.shuttleSheet);
  closeShuttleSheet();
  renderFleetInfo();
  renderMapFleets();
};
