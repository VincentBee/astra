import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { toast } from '../outils/toast.js';

/**
 * La fenêtre Scinder / Donner suit l'état (#73) : si sa flotte (ou celle qui reçoit) n'existe
 * plus, détruite, absorbée ou éliminée, elle se ferme avec un message, au lieu d'un bouton muet.
 */
export function refreshMoveSheet() {
  if (!etat.moveSheet || $('sheet-move').hidden) return;
  const gone = !etat.session.myFleet(etat.moveSheet.from) || (etat.moveSheet.kind === 'give' && !etat.session.myFleet(etat.moveSheet.to));
  if (!gone) return;
  $('sheet-move').hidden = true;
  etat.moveSheet = null;
  toast('Cette flotte n’existe plus.');
}
