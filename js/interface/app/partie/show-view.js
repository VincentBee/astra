import { drawMap } from '../carte/draw-map.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { renderLive } from './render-live.js';
import { showTab } from './show-tab.js';
import { stopMap } from './stop-map.js';

/** Carte (vue principale) ou bâtiments d'une de mes planètes. */
export function showView(view, key = etat.openKey) {
  etat.currentView = view;
  etat.openKey = key;
  $('view-universe').hidden = view !== 'map';
  $('view-planet').hidden = view !== 'planet';
  // Pas de barre du haut : le compteur de joueurs se range à droite de la première ligne de l'écran.
  // L'icône de diagnostic le suit, et sa liste se déplie sous cette même ligne.
  const head = document.querySelector(view === 'map' ? '.map-head' : '.planet-head');
  (view === 'map' ? head.querySelector('.pi-head-right') : head).append($('btn-journal'), $('alerts-btn'), $('btn-settings'), $('net'));
  head.append($('alerts-panel'));
  window.scrollTo(0, 0);
  if (view === 'planet') showTab('build'); // une planète s'ouvre toujours sur ses bâtiments (D-156)
  if (view === 'map') {
    if (!etat.mapFrame) etat.mapFrame = requestAnimationFrame(drawMap);
  } else stopMap();
  if (etat.session?.state) renderLive(); // pas d'image de l'écran précédent pendant 200 ms
}
