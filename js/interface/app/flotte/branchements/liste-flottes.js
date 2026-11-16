import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { showView } from '../../partie/show-view.js';
import { renderFleetInfo } from '../pilotage/render-fleet-info.js';

$('fleets').addEventListener('click', (e) => {
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  etat.selFleet = id;
  showView('map');
  renderFleetInfo();
});
