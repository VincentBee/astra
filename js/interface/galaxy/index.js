// Fond de galaxie : un dégradé de nébuleuse et trois couches d'étoiles,
// réunies en une seule image immobile (plus de parallaxe, D-137 : ni
// capteurs ni redessin quand on bouge le téléphone).
//
// Deux réglages (« Fond », gardé dans astra.sky) :
// - fixe  : les étoiles, en une image de la taille de l'écran (par défaut) ;
// - aucun : rien que le dégradé CSS du body, pas de canvas.
// L'ancien « anime » (parallaxe) gardé dans un téléphone devient « fixe ».

export { SKY_MODES } from './sky-modes.js';
export { skyMode } from './sky-mode.js';
export { setSkyMode } from './set-sky-mode.js';
export { startGalaxy } from './start-galaxy.js';
