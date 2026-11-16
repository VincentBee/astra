import { etat } from '../etat.js';

/**
 * `fn()` est appelé quand une sauvegarde de la partie en cours échoue (au plus une fois par
 * minute). Il renvoie `false` si le message n'a pas pu être montré (appli cachée) : on
 * préviendra au prochain échec. `fn('history', n)` : en reprenant l'ancien format, `n` parties
 * de l'historique n'ont pas pu être recopiées (perdues).
 */
export function onSaveFailed(fn) {
  etat.failed = fn;
}
