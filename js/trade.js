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

import { settle } from './game.js';
import { fuelAt, freeze, fleetCargo, fleetTank } from './fleet.js';

export const TRADE_RES = ['minerals', 'food', 'fuel'];
export const OFFER_MS = 5 * 60_000;
export const GRACE_MS = 60_000;
export const ABANDON_MS = 30 * 60_000;
export const MAX_OFFERS = 10;

export const TRADE_NAMES = { minerals: 'Minéraux', food: 'Nourriture', fuel: 'Carburant' };

/** Quantités propres : entiers positifs, ressources connues. */
export function amounts(x) {
  return Object.fromEntries(TRADE_RES.map((r) => [r, Math.max(0, Math.floor(Number(x?.[r]) || 0))]));
}

export const isEmpty = (a) => TRADE_RES.every((r) => !a?.[r]);

/** Ce que possède une partie. */
export function holdings(side, race, now) {
  if (side.fleet) {
    const f = side.fleet;
    return { minerals: f.cargo?.minerals || 0, food: f.cargo?.food || 0, fuel: Math.floor(fuelAt(f, race, now)) };
  }
  const s = side.planet.stock || {};
  return { minerals: Math.floor(s.minerals || 0), food: Math.floor(s.food || 0), fuel: Math.floor(s.energy || 0) };
}

/** La partie a-t-elle de quoi donner `amt` ? Erreur ou null. */
export function lacks(side, race, amt, now) {
  if (side.planet) settle(side.planet, now);
  const h = holdings(side, race, now);
  const miss = TRADE_RES.filter((r) => (amt[r] || 0) > h[r]);
  return miss.length ? `Pas assez de ${miss.map((r) => TRADE_NAMES[r].toLowerCase()).join(', ')}.` : null;
}

/**
 * La partie a-t-elle la place de recevoir `amt`, une fois parti ce qu'elle
 * donne (`out`) ? Une planète a toujours la place. Erreur ou null.
 */
export function noRoom(side, race, amt, now, out = {}) {
  if (!side.fleet) return null;
  const f = side.fleet;
  const load = (f.cargo?.minerals || 0) + (f.cargo?.food || 0) - (out.minerals || 0) - (out.food || 0) + (amt.minerals || 0) + (amt.food || 0);
  if (load > fleetCargo(race, f.ships)) return 'Les soutes sont trop petites.';
  if (fuelAt(f, race, now) - (out.fuel || 0) + (amt.fuel || 0) > fleetTank(race, f.ships) + 1e-6) return 'Les réservoirs sont trop petits.';
  return null;
}

/** Retire `amt` d'une partie (vérifié avant). */
export function take(side, race, amt, now) {
  if (side.planet) {
    settle(side.planet, now);
    const s = side.planet.stock;
    s.minerals -= amt.minerals || 0;
    s.food -= amt.food || 0;
    s.energy -= amt.fuel || 0;
    return;
  }
  const f = side.fleet;
  freeze(f, race, now);
  f.cargo = { ...f.cargo, minerals: (f.cargo?.minerals || 0) - (amt.minerals || 0), food: (f.cargo?.food || 0) - (amt.food || 0) };
  f.fuel -= amt.fuel || 0;
}

/**
 * Ajoute `amt` à une partie. Une flotte ne garde que ce qui tient dans ses
 * soutes et ses réservoirs (elle a pu perdre des vaisseaux entre-temps).
 */
export function put(side, race, amt, now) {
  if (side.planet) {
    settle(side.planet, now);
    const s = side.planet.stock;
    s.minerals = (s.minerals || 0) + (amt.minerals || 0);
    s.food = (s.food || 0) + (amt.food || 0);
    s.energy = (s.energy || 0) + (amt.fuel || 0);
    return;
  }
  const f = side.fleet;
  freeze(f, race, now);
  let room = Math.max(0, fleetCargo(race, f.ships) - (f.cargo?.minerals || 0) - (f.cargo?.food || 0));
  const minerals = Math.min(room, amt.minerals || 0);
  room -= minerals;
  const food = Math.min(room, amt.food || 0);
  f.cargo = { ...f.cargo, minerals: (f.cargo?.minerals || 0) + minerals, food: (f.cargo?.food || 0) + food };
  f.fuel = Math.min(fleetTank(race, f.ships), f.fuel + (amt.fuel || 0));
}

/**
 * Sort d'une offre que je dois régler, vue de chez moi : `answer` est la
 * réponse de l'autre joueur (ou null), `theirActAt` l'heure de la dernière
 * modification de sa fiche. 'accepted' : je reçois ce que j'ai demandé ;
 * 'returned' : mon séquestre me revient ; null : j'attends.
 */
export function outcome(offer, answer, now, theirActAt = 0) {
  if (answer) return answer.ok && answer.at <= offer.expires ? 'accepted' : 'returned';
  // Sa fiche a bougé bien après l'expiration sans réponse : il n'acceptera plus.
  if (theirActAt > offer.expires + GRACE_MS) return 'returned';
  return now > offer.expires + ABANDON_MS ? 'returned' : null;
}
