// Technologies et vaisseaux de chaque race : données pures, sans réseau ni DOM.
//
// Chaque race a son propre arbre de recherche (une technologie demande un
// niveau de labo et, souvent, une autre technologie) et sa propre flotte :
// un cargo, un vaisseau colonisateur, un chasseur et un vaisseau lourd, qui
// lui ressemblent. Les humains sont polyvalents, les machines bon marché,
// rapides et fragiles, les aliens chers, lents et redoutables.
//
// Effets des technologies, par niveau : `bonus` ajoute une part (0,1 = +10 %)
// à l'extraction de minéraux, à la nourriture, à l'énergie produite, ou aux
// vaisseaux (vitesse, attaque, coque). `unlock` débloque un vaisseau à partir
// d'un niveau. `range` ajoute des cases à la portée de détection (voir
// sightRange), autour des planètes et des flottes du joueur.

export { TEMPO } from './tempo.js';
export { TECHS } from './techs.js';
export { SIGHT } from './sight.js';
export { sightRange } from './sight-range.js';
export { SHIPS } from './ships.js';
export { SHIP_KEYS } from './ship-keys.js';
export { techBonus } from './tech-bonus.js';
export { techCost } from './tech-cost.js';
export { researchDuration } from './research-duration.js';
export { techMissing } from './tech-missing.js';
export { shipUnlock } from './ship-unlock.js';
export { shipUnlocked } from './ship-unlocked.js';
export { shipStats } from './ship-stats.js';
export { shipDuration } from './ship-duration.js';
