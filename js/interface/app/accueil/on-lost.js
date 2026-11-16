import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { show } from '../outils/show.js';
import { stopGame } from '../partie/stop-game.js';
import { showSaved } from './show-saved.js';

/**
 * La partie a été ouverte dans un autre onglet (ou l'appli installée, D-430) : elle continue
 * là-bas, celui-ci s'est arrêté sans rien sauver. Retour à l'accueil, avec un message qui reste
 * (l'onglet est souvent caché à ce moment : un toast ne serait pas vu).
 */
export function onLost(lost) {
  if (lost !== etat.session) return; // une ancienne session de cet onglet, déjà remplacée
  stopGame();
  for (const el of document.querySelectorAll('.sheet')) el.hidden = true;
  etat.session = null;
  show('home');
  showSaved();
  $('home-note').textContent = 'Cette partie a été ouverte dans un autre onglet : elle continue là-bas. Pour la jouer ici, appuie sur « Reprendre ».';
  $('home-note').hidden = false;
}
