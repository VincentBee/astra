/**
 * Propriétaire d'une case : le premier à s'y être installé (planète mère
 * ou colonie). Deux joueurs peuvent s'installer au même endroit au même
 * moment (ou coupés l'un de l'autre) ; c'est le plus ancien qui compte,
 * partout pareil.
 */
/** `o` s'est-il déclaré éliminé à l'heure `at` ou avant ? Ses actes d'après ne comptent pas (D-180). */
export function goneBy(o, at) {
  return Number.isFinite(o?.out) && at >= o.out;
}
