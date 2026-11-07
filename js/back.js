// « Retour » pendant une partie en cours (D-417) : sans DOM, la décision seule.
// js/app.js garde une entrée d'historique au-dessus de la page tant que la partie est en cours ;
// un retour la consomme (popstate) et cette fonction dit quoi faire.

/**
 * Une partie est « en cours » : partie (`startedAt`), pas finie (`over`), écran de jeu affiché.
 * Le lobby (avant le départ) et l'écran de fin n'en sont pas.
 */
export function playing({ status, startedAt, over, gameShown }) {
  return status === 'playing' && startedAt != null && !over && !!gameShown;
}

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
