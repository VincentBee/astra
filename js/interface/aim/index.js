// Visée sur la carte (D-126) : ce que le doigt touche, sans calcul de règles.
//
// Les objets (planètes, flottes) sont donnés en cases, centre de la case = (x, y), comme le
// point touché. Le doigt a une taille fixe à l'écran (FINGER pixels CSS) : à zoom 1, une case
// fait ~17 px sur un téléphone, le doigt en couvre plus d'une ; zoomé, il en couvre moins, mais
// jamais moins de MIN_REACH case. L'objet le plus proche gagne, sauf si d'autres sont presque
// aussi près (moins de GAP pixels d'écart) : alors on demande, au lieu de deviner.

export { FINGER } from './finger.js';
export { MIN_REACH } from './min-reach.js';
export { GAP } from './gap.js';
export { reach } from './reach.js';
export { underFinger } from './under-finger.js';
export { contenders } from './contenders.js';
export { readTap } from './read-tap.js';
export { menuPlace } from './menu-place.js';
