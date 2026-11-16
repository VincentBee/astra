import { playing } from './playing.js';

/**
 * Que faire d'un retour ?
 * - 'pass' : rien de spécial (lobby, fin de partie, autre écran) ; le retour suivant quitte.
 * - 'close' : une fenêtre est ouverte, on la ferme et on reste (comme sa croix).
 * - 'ask' : on demande « Quitter la partie en cours ? ».
 */
export function backAction(ctx) {
  if (!playing(ctx)) return 'pass';
  if (ctx.sheetOpen) return 'close';
  return 'ask';
}
