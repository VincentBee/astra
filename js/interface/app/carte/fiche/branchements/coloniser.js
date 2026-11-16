import { sameCell } from '../../../../../game.js';
import { myColonizer } from '../../../depart/my-colonizer.js';
import { etat } from '../../../etat.js';
import { renderFleetInfo } from '../../../flotte/pilotage/render-fleet-info.js';
import { renderMapFleets } from '../../../flotte/pilotage/render-map-fleets.js';
import { $ } from '../../../outils/dollar.js';
import { renderPick } from '../render-pick.js';

$('btn-claim').onclick = () => {
  const w = etat.selected && etat.session.planets.find((x) => sameCell(x, etat.selected));
  const f = myColonizer(etat.session.state.players[etat.session.me]);
  if (!w || !f || !etat.session.moveFleet(f.id, { x: w.x, y: w.y }, 'colonize')) return;
  etat.selected = null;
  etat.selFleet = f.id; // la flotte reste choisie : on la voit partir
  renderPick();
  renderFleetInfo();
  renderMapFleets();
};
