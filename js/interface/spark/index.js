// Historique des mini-graphes (« sparklines ») des tuiles de ressources.
// Fonctions pures, sans DOM ni localStorage : app.js s'en sert, les tests aussi.
//
// Un historique par planète : { id: 'partie|joueur', p: { clé de planète: { t: [instants], v: { ressource: [valeurs] } } } }.
// Chaque planète garde ses 10 dernières minutes, même quand on regarde une autre planète.

export { SAMPLE_MS } from './sample-ms.js';
export { HISTORY_MS } from './history-ms.js';
export { emptyHistory } from './empty-history.js';
export { ownHistory } from './own-history.js';
export { addSample } from './add-sample.js';
export { sparkPath } from './spark-path.js';
