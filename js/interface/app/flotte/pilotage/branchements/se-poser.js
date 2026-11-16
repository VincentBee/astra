import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { renderFleetInfo } from '../render-fleet-info.js';

$('btn-fi-dock').onclick = () => {
  const f = etat.session.myFleet(etat.selFleet);
  if (f) etat.session.moveFleet(etat.selFleet, f.to, 'dock');
  renderFleetInfo();
};
