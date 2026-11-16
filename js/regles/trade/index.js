// Échanges entre joueurs : fonctions pures, sans réseau ni DOM.
//
// Un joueur propose depuis une de ses flottes (ou une de ses planètes) à
// une flotte ou une planète d'un autre joueur, sur la même case : « je
// donne ceci, je demande cela » (ou rien, pour un don). Chacun n'écrit que
// sa fiche : l'offre vit chez celui qui propose, la réponse chez l'autre.
//
// Pour qu'il n'y ait jamais rien à défaire :
//   - ce qui est donné part sous séquestre dès la proposition ;
//   - on ne peut pas annuler une offre, elle expire au bout de OFFER_MS ;
//   - une acceptation datée d'avant l'expiration vaut, point. Celui qui
//     accepte connaît l'heure d'expiration et vérifie lui-même.
// Sans réponse, le séquestre ne revient pas sur la seule horloge de celui
// qui propose : une acceptation faite à temps peut arriver tard (téléphone
// en veille, partie coupée en deux). Il revient quand la fiche de l'autre
// prouve qu'il a continué à jouer après l'expiration (+ GRACE_MS, pour
// l'écart d'heure entre téléphones) sans accepter, ou au bout de
// ABANDON_MS si l'autre joueur ne revient pas. De son côté, le téléphone
// de l'autre refuse tout seul une offre expirée sans réponse.
//
// Une « partie » est { fleet } ou { planet } ; le carburant d'une planète
// est l'énergie de son stock.

export { TRADE_RES } from './trade-res.js';
export { OFFER_MS } from './offer-ms.js';
export { GRACE_MS } from './grace-ms.js';
export { ABANDON_MS } from './abandon-ms.js';
export { MAX_OFFERS } from './max-offers.js';
export { TRADE_NAMES } from './trade-names.js';
export { amounts } from './amounts.js';
export { isEmpty } from './is-empty.js';
export { holdings } from './holdings.js';
export { lacks } from './lacks.js';
export { noRoom } from './no-room.js';
export { take } from './take.js';
export { put } from './put.js';
export { outcome } from './outcome.js';
