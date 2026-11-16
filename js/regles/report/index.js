// Rapport de combat détaillé (D-122) : à partir du déroulé que `battle`
// (js/fleet.js) renvoie dans `report`, dire ce qui s'est passé, passe par
// passe, et pourquoi on a gagné ou perdu. Pur : aucun état, aucun réseau ;
// le texte est vu par un camp (`side` : 'a' l'attaquant, 'd' le défenseur).
//
// Le déroulé voyage dans le rapport (`effects`) que l'attaquant écrit pour
// le défenseur : `cleanReport` le borne, comme toute donnée d'un autre
// téléphone. Il ne sert qu'à l'affichage : rien n'en dépend dans les règles.

export { cleanReport } from './clean-report.js';
export { shipName } from './ship-name.js';
export { sideTable } from './side-table.js';
export { explainBattle } from './explain-battle.js';
