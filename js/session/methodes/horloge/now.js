/**
 * Heure de la partie : l'heure commune (D-165). Figée le temps d'un ordre, pour qu'il se rejoue
 * à l'identique.
 */
export function now() {
  return this.entry?.t ?? this.clock();
}
