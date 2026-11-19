// La carte en 3D (D-559, D-563) : un module à part, chargé seulement si « Carte en 3D » est
// cochée dans les Réglages (js/interface/app/carte/relief/). Assemblé seul dans
// dist/js/bassin-3d.js, hors du cache hors ligne de départ.

export { installDeps } from './install-deps.js';
export { makeView } from './make-view.js';
export { drawMap3d } from './draw-map-3d.js';
