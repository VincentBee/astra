/** Inclinaison de la carte en 3D (D-562), en radians depuis la verticale (le jeu la garde dans `zoom.t`). */
export const TILT = {
  start: 0.55, // au départ (~32°) : le haut de la carte s'éloigne
  min: 0, // vue de dessus
  max: 1, // ~57° : au-delà, les cases du fond deviennent trop petites pour le doigt
  steps: [0.55, 1, 0], // les crans du bouton « Incliner », dans l'ordre
};
