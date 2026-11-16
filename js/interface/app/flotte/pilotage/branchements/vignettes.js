import { renderPick } from '../../../carte/fiche/render-pick.js';
import { closeMenu } from '../../../carte/menu/close-menu.js';
import { fleetSpots } from '../../../carte/selection/fleet-spots.js';
import { reveal } from '../../../carte/zoom/reveal.js';
import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { openFleetSheet } from '../../decollage/open-fleet-sheet.js';
import { renderFleetInfo } from '../render-fleet-info.js';
import { renderMapFleets } from '../render-map-fleets.js';

$('map-fleets').addEventListener('click', (e) => {
  if (!etat.session?.state) return;
  const me = etat.session.state.players[etat.session.me];
  // Construire : la fiche de la planète s'ouvre sur son chantier (×1, ×5, ×N, D-106).
  const build = e.target.closest('[data-mp-build]')?.dataset.mpBuild;
  if (build) {
    const pl = etat.session.planetOf(me, build);
    if (!pl) return;
    etat.selected = { x: pl.cell.x, y: pl.cell.y };
    renderPick();
    $('pi-yard').scrollIntoView({ block: 'nearest' });
    return;
  }
  // Décoller : le formulaire de décollage de cette planète, directement.
  const go = e.target.closest('[data-mp-go]')?.dataset.mpGo;
  if (go) {
    etat.selected = null;
    renderPick();
    openFleetSheet(go);
    return;
  }
  // Ailleurs sur la case d'une planète : sa fiche, comme en la touchant sur la carte.
  const tile = e.target.closest('[data-planet]')?.dataset.planet;
  const pl = tile && etat.session.planetOf(me, tile);
  if (pl) {
    etat.selected = { x: pl.cell.x, y: pl.cell.y };
    return renderPick();
  }
  const id = e.target.closest('[data-fleet]')?.dataset.fleet;
  if (!id) return;
  etat.selFleet = etat.selFleet === id ? null : id; // retoucher la flotte choisie la relâche
  closeMenu();
  const spot = etat.selFleet && fleetSpots(etat.session.now()).find((x) => x.p.id === etat.session.me && x.f.id === etat.selFleet);
  if (spot) reveal(spot.x, spot.y); // carte zoomée : la flotte choisie revient dans la vue
  renderFleetInfo();
  renderMapFleets();
});
