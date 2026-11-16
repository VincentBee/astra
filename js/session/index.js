// Une partie vue depuis un téléphone. Tous les téléphones sont au même
// niveau : pas de maître du jeu, chacun garde une copie complète de la partie
// et chacun peut inviter de nouveaux joueurs.
//
// Comment rester d'accord sans arbitre : chaque joueur est le seul à écrire
// sa propre fiche (sa planète). Il applique ses ordres tout de
// suite chez lui, puis envoie sa fiche à jour aux autres. Une fiche porte
// l'heure de sa dernière modification (`actAt`) : entre deux versions de la
// même fiche, la plus récente l'emporte. Comme personne n'écrit la fiche d'un
// autre, il n'y a jamais de conflit, même si le groupe a été coupé en deux.
//
// Les fiches se propagent de proche en proche : un téléphone qui reçoit une
// fiche plus récente que la sienne la transmet à ses autres voisins.
//
// Reconnexion sans rescanner : tous les téléphones de la partie se donnent
// rendez-vous via des relais publics (js/rendezvous.js). En se retrouvant,
// deux téléphones échangent leurs copies et gardent, pour chaque joueur, la
// fiche la plus récente.

// Sections de la classe Session (méthodes rangées dans methodes/<thème>/) :
// ----- création / arrivée ------------------------------------------------
// ----- état ------------------------------------------------------------------
// ----- connexions ------------------------------------------------------------
// ----- messages --------------------------------------------------------------
// ----- rendez-vous automatique (reconnexion sans rescanner) ---------------
// ----- maillage : chacun peut présenter deux joueurs ----------------------
// ----- invitations (tout le monde peut inviter) ---------------------------
// ----- jeu ---------------------------------------------------------------------
// ----- planètes ---------------------------------------------------------------
// ----- détection ---------------------------------------------------------
// ----- échanges entre joueurs ---------------------------------------------

import './main.js';
import { FORMAT } from './constantes/format.js';
import { RDV_RETRY_MS } from './constantes/rdv-retry-ms.js';
import { CLOCK_DRIFT_MS } from './constantes/clock-drift-ms.js';
import { MAX_ORDERS } from './constantes/max-orders.js';
import { normalize } from './fiches/normalize.js';
import { pidOk } from './fiches/pid-ok.js';
import { threatText } from './textes/threat-text.js';
import { Session } from './session.js';
import { ORDER_KINDS } from './constantes/order-kinds.js';
import { AUTO_SETTLE } from './textes/auto-settle.js';
export { FORMAT } from './constantes/format.js';
export { RDV_RETRY_MS } from './constantes/rdv-retry-ms.js';
export { CLOCK_DRIFT_MS } from './constantes/clock-drift-ms.js';
export { MAX_ORDERS } from './constantes/max-orders.js';
export { normalize } from './fiches/normalize.js';
export { pidOk } from './fiches/pid-ok.js';
export { threatText } from './textes/threat-text.js';
export { Session } from './session.js';
export { ORDER_KINDS } from './constantes/order-kinds.js';
export { AUTO_SETTLE } from './textes/auto-settle.js';
