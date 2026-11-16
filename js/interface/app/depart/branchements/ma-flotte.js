import { renderPick } from '../../carte/fiche/render-pick.js';
import { fleetSpots } from '../../carte/selection/fleet-spots.js';
import { reveal } from '../../carte/zoom/reveal.js';
import { etat } from '../../etat.js';
import { renderFleetInfo } from '../../flotte/pilotage/render-fleet-info.js';
import { renderMapFleets } from '../../flotte/pilotage/render-map-fleets.js';
import { $ } from '../../outils/dollar.js';
import { showView } from '../../partie/show-view.js';

$('btn-pick-fleet').onclick = (e) => {
  const id = e.currentTarget.dataset.fleet;
  if (!id) return;
  etat.selFleet = id;
  etat.selected = null;
  showView('map');
  const spot = fleetSpots(etat.session.now()).find((x) => x.p.id === etat.session.me && x.f.id === id);
  if (spot) reveal(spot.x, spot.y);
  renderPick();
  renderFleetInfo();
  renderMapFleets();
};
