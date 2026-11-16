// « Retour » pendant une partie en cours (D-417) : sans DOM, la décision seule.
// js/app.js garde une entrée d'historique au-dessus de la page tant que la partie est en cours ;
// un retour la consomme (popstate) et cette fonction dit quoi faire.

export { playing } from './playing.js';
export { backAction } from './back-action.js';
