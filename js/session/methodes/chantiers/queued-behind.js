import { stateAt } from '../../../game.js';

/**
 * Fil non vide sur cette planète, maintenant (D-420) : une construction lancée à la main
 * (bâtiment, recherche, vaisseaux) n'y passe pas devant, elle va à la fin du fil. Au rejeu
 * (`replaying`), un ordre « tout de suite » garde son sens d'avant : les ordres redirigés
 * sont notés au journal sous leur vrai nom (toPlan), un vieux journal se rejoue pareil.
 */
export function queuedBehind(pl) {
  return !this.replaying && stateAt(pl.planet, this.now()).plan.length > 0;
}
