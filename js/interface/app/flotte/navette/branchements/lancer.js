import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../../pilotage/render-fleet-info.js';
import { renderMapFleets } from '../../pilotage/render-map-fleets.js';
import { closeShuttleSheet } from '../close-shuttle-sheet.js';
import { shuttleCell } from '../shuttle-cell.js';

$('btn-shuttle-go').onclick = () => {
  const res = [...document.querySelectorAll('[data-shres]')].filter((el) => el.checked).map((el) => el.dataset.shres);
  if (!etat.session.shuttleFleet(etat.shuttleSheet, shuttleCell($('shuttle-a').value), shuttleCell($('shuttle-b').value), res)) {
    if (!etat.session.myFleet(etat.shuttleSheet)) closeShuttleSheet();
    return;
  }
  closeShuttleSheet();
  renderFleetInfo();
  renderMapFleets();
};
