// Rejeu d'une partie à partir des journaux d'ordres.
//
// Chaque joueur note dans sa fiche ce qui l'a changée (`orders`) : ses
// ordres et les passages (`tick`) où quelque chose a avancé (chantier
// terminé, arrivée, combat), avec l'heure et les identifiants tirés. Comme
// chaque joueur est le seul à écrire sa fiche, et que tout se calcule à
// partir de l'heure, rejouer ces journaux dans l'ordre des heures, sur une
// horloge commune, refait la partie.
//
// Chaque entrée dit aussi combien d'entrées des journaux des autres le
// joueur avait reçues : au rejeu, il retrouve les fiches des autres telles
// qu'il les voyait, même partie coupée en deux ou horloges décalées.
// `faithful` dit si la fin du rejeu retombe sur les fiches de la vraie partie.

export { comparable } from './comparable.js';
export { replayable } from './replayable.js';
export { replay } from './replay.js';
export { playersAt } from './players-at.js';
export { ficheScore } from './fiche-score.js';
export { scoreSeries } from './score-series.js';
