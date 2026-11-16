// Flottes : des unités qu'on pilote sur la carte. Fonctions pures.
//
// Une flotte décolle d'une planète du joueur avec des vaisseaux et, s'il le
// veut, une cargaison. Elle reste ensuite sur la carte jusqu'à ce qu'elle se
// pose sur une de ses planètes ou soit détruite. On peut l'envoyer sur
// n'importe quelle case, l'arrêter, changer de cap, la faire rentrer.
//
// Sa position tient dans un segment daté (from, to, depart, arrive) : tous
// les téléphones la voient avancer de la même façon. À l'arrêt, from et to
// sont la même case. Chaque nouvel ordre ouvre un segment depuis là où elle
// est. Elle brûle du carburant (de l'énergie) à chaque case parcourue :
// si son réservoir ne suffit pas, le segment s'arrête dès l'ordre donné au
// point de panne (`stranded`). Tous les téléphones voient donc la même
// panne, sans rien calculer en route. À sec, la flotte attend qu'on la
// ravitaille. Un ordre peut attendre l'arrivée :
//   dock     : se poser sur une de ses planètes (vaisseaux et cargaison y restent) ;
//   colonize : fonder une colonie sur une planète libre (le premier arrivé l'emporte) ;
//   attack   : combattre les vaisseaux à quai d'une planète adverse et piller
//              ce que les soutes peuvent emporter. Les survivants restent en orbite.
// C'est le téléphone du propriétaire qui applique l'arrivée.

export { MAX_FLEETS } from './ordres/max-fleets.js';
export { ORDERS } from './ordres/orders.js';
export { STANCES } from './ordres/stances.js';
export { aggressive } from './ordres/aggressive.js';
export { armed } from './caracteristiques/armed.js';
export { CONTACT } from './combat/contact.js';
export { countShips } from './caracteristiques/count-ships.js';
export { fleetSpeed } from './caracteristiques/fleet-speed.js';
export { slowestShip } from './caracteristiques/slowest-ship.js';
export { fleetCargo } from './caracteristiques/fleet-cargo.js';
export { fleetTank } from './caracteristiques/fleet-tank.js';
export { fleetBurn } from './caracteristiques/fleet-burn.js';
export { fuelAt } from './caracteristiques/fuel-at.js';
export { tripMs } from './deplacement/trip-ms.js';
export { launch } from './deplacement/launch.js';
export { fleetPos } from './deplacement/fleet-pos.js';
export { moving } from './deplacement/moving.js';
export { moveTo } from './deplacement/move-to.js';
export { setShips } from './deplacement/set-ships.js';
export { fuelNeed } from './deplacement/fuel-need.js';
export { refuel } from './deplacement/refuel.js';

// ----- Entre mes flottes ----------------------------------------------------
//
// Deux de mes flottes arrêtées sur la même case peuvent s'échanger
// vaisseaux, cargaison et carburant, fusionner, ou une flotte se scinder en
// deux. Tout se passe dans la fiche du joueur, tout de suite.

export { parkedCell } from './entre-flottes/parked-cell.js';
export { together } from './entre-flottes/together.js';
export { freeze } from './entre-flottes/freeze.js';
export { transfer } from './entre-flottes/transfer.js';
export { split } from './entre-flottes/split.js';
export { merge } from './entre-flottes/merge.js';
export { stopAt } from './deplacement/stop-at.js';

// ----- Poursuite et combat entre flottes --------------------------------------
//
// Une flotte en poursuit une autre en visant le point d'interception : là
// où sera la cible quand elle-même pourra y être, d'après le segment que
// la cible suit (connu de tous). Viser sa position actuelle ne rattraperait
// jamais une cible aussi rapide. Le contact se fait à moins de CONTACT
// cases ; c'est le téléphone du poursuivant qui calcule le combat.

export { intercept } from './combat/intercept.js';
export { inContact } from './combat/in-contact.js';
export { firstContact } from './combat/first-contact.js';
export { salvage } from './combat/salvage.js';
export { applyLosses } from './combat/apply-losses.js';
export { battle } from './combat/battle.js';
export { plunder } from './combat/plunder.js';
