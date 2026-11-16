import { etat } from '../../etat.js';
import { renderFleetInfo } from '../../flotte/pilotage/render-fleet-info.js';
import { $ } from '../../outils/dollar.js';
import { openMoveSheet } from '../open-move-sheet.js';

$('fi-beside').addEventListener('click', (e) => {
  const give = e.target.closest('[data-give]')?.dataset.give;
  const into = e.target.closest('[data-merge]')?.dataset.merge;
  if (give) openMoveSheet('give', give);
  // « Fusionner ici » : l'autre flotte rejoint celle qui est sélectionnée.
  if (into && etat.session.mergeFleets(into, etat.selFleet)) renderFleetInfo();
});
