import { etat } from '../etat.js';
import { keepAwake } from '../outils/keep-awake.js';
import { show } from '../outils/show.js';
import { renderState } from '../planete/render-state.js';
import { showRace } from '../race/show-race.js';
import { buildStatic } from './build-static.js';
import { renderLive } from './render-live.js';
import { showView } from './show-view.js';

export function startGame() {
  if (!etat.session.myRace) return showRace();
  show('game');
  buildStatic();
  etat.selected = null;
  etat.alertsSeen = new Map();
  showView('map');
  // Le rafraîchissement d'abord : un premier rendu qui échouerait ne doit pas figer l'écran.
  clearInterval(etat.liveTimer);
  etat.liveTimer = setInterval(renderLive, 200);
  renderState();
  keepAwake();
}
