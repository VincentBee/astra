import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { inGame } from './in-game.js';

/** Pose la garde dès que la partie est en cours (appelé à chaque rafraîchissement). */
export function armBack() {
  if (etat.backArmed || etat.leaving || !$('sheet-quit').hidden || !inGame()) return;
  history.pushState({ astraGuard: true }, '');
  etat.backArmed = true;
}
