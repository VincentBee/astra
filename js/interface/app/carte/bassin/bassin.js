/**
 * Réglages du bassin (D-559) : la carte vue en 3D, comme un petit bassin peu profond posé
 * devant soi. Le jeu reste sur un plan (le plan du jeu, hauteur 0, au niveau du rebord) ;
 * seul l'affichage change. Longueurs en cases, angles en radians.
 */
export const BASSIN = {
  dist: 2.4, // distance de la caméra au centre de la vue, en largeurs de vue (perspective douce)
  fill: 0.95, // part de la largeur du canvas prise par le bord proche de la vue
  floor: 0.5, // profondeur du fond sous le plan du jeu
  rim: 0.3, // largeur du rebord
  base: 0.45, // hauteur de la face avant sous le fond
  ship: 0.22, // hauteur des vaisseaux au-dessus du plan du jeu
};
