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
// est. Un ordre peut attendre l'arrivée :
//   dock     : se poser sur une de ses planètes (vaisseaux et cargaison y restent) ;
//   colonize : fonder une colonie sur une planète libre (le premier arrivé l'emporte) ;
//   attack   : combattre les vaisseaux à quai d'une planète adverse et piller
//              ce que les soutes peuvent emporter. Les survivants restent en orbite.
// C'est le téléphone du propriétaire qui applique l'arrivée.

import { distance, covers, settle, SOIL } from './game.js';
import { SHIPS, SHIP_KEYS, shipStats } from './tech.js';

export const MAX_FLEETS = 16;
/** Un trajet dure au moins ce temps (ms), dès qu'il faut bouger. */
const MIN_TRIP = 5_000;

export const ORDERS = {
  dock: { name: 'Se poser', verb: 'va se poser sur' },
  colonize: { name: 'Colonisation', verb: 'part coloniser' },
  attack: { name: 'Attaque', verb: 'attaque' },
};

export const countShips = (ships) => Object.values(ships || {}).reduce((a, b) => a + (b || 0), 0);

/** Vitesse d'une flotte : celle de son vaisseau le plus lent (cases par minute). */
export function fleetSpeed(race, ships, tech) {
  let v = Infinity;
  for (const [k, n] of Object.entries(ships)) if (n > 0) v = Math.min(v, shipStats(race, k, tech).speed);
  return Number.isFinite(v) ? v : 0;
}

/** Capacité totale des soutes. */
export function fleetCargo(race, ships) {
  let c = 0;
  for (const [k, n] of Object.entries(ships)) c += (n || 0) * SHIPS[race][k].cargo;
  return c;
}

/** Durée du trajet en ms, à la vitesse de la flotte. */
export function tripMs(from, to, speed) {
  const d = distance(from, to);
  if (!d) return 0;
  if (!speed) return Infinity;
  return Math.max(MIN_TRIP, Math.round((d / speed) * 60_000));
}

/**
 * Décollage depuis une planète du joueur : retire les vaisseaux et la
 * cargaison de la planète. La flotte attend en orbite, sur la case de la
 * planète. Renvoie { error } ou { fleet }.
 */
export function launch(planet, { ships, cargo = {}, at, origin, id }, now) {
  settle(planet, now);
  const race = planet.race;
  const clean = {};
  for (const k of SHIP_KEYS) {
    const n = Math.floor(ships?.[k] || 0);
    if (n < 0) return { error: 'Nombre de vaisseaux invalide.' };
    if (n > (planet.ships?.[k] || 0)) return { error: `Pas assez de ${SHIPS[race][k].name}.` };
    if (n) clean[k] = n;
  }
  if (!countShips(clean)) return { error: 'Choisis au moins un vaisseau.' };
  const load = {};
  for (const r of SOIL) load[r] = Math.max(0, Math.floor(cargo[r] || 0));
  if (load.minerals + load.food > fleetCargo(race, clean)) return { error: 'Les soutes sont trop petites pour cette cargaison.' };
  if (!covers(planet.stock, load)) return { error: 'Pas assez de ressources pour cette cargaison.' };
  for (const [k, n] of Object.entries(clean)) planet.ships[k] -= n;
  for (const [r, v] of Object.entries(load)) planet.stock[r] -= v;
  const cell = { x: at.x, y: at.y };
  const fleet = { id, ships: clean, cargo: load, origin, from: cell, to: { ...cell }, depart: now, arrive: now, order: null };
  return { fleet };
}

/** Position d'une flotte à l'instant `now` (interpolée entre départ et arrivée). */
export function fleetPos(f, now) {
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return { x: f.from.x + (f.to.x - f.from.x) * k, y: f.from.y + (f.to.y - f.from.y) * k };
}

/** La flotte est-elle encore en route à `now` ? */
export const moving = (f, now) => f.arrive > now;

/**
 * Nouvel ordre de déplacement : la flotte part de là où elle est à `now`
 * vers la case `cell`, et `order` s'appliquera à l'arrivée (null : simple
 * déplacement). Modifie la flotte ; renvoie un message d'erreur ou null.
 */
export function moveTo(f, race, tech, cell, order, now) {
  const speed = fleetSpeed(race, f.ships, tech);
  if (!speed) return 'Cette flotte ne peut pas bouger.';
  const pos = fleetPos(f, now);
  const to = { x: cell.x, y: cell.y };
  Object.assign(f, { from: pos, to, depart: now, arrive: now + tripMs(pos, to, speed), order: order || null });
  return null;
}

/** Arrêt : la flotte finit sa course sur la case la plus proche, et y attend. */
export function stopAt(f, race, tech, now) {
  const pos = fleetPos(f, now);
  return moveTo(f, race, tech, { x: Math.round(pos.x), y: Math.round(pos.y) }, null, now);
}

/**
 * Combat, sans hasard : les deux téléphones qui le calculent trouvent le
 * même résultat. Jusqu'à 4 passes ; à chaque passe, chaque camp inflige son
 * attaque totale, répartie sur les vaisseaux adverses au prorata de leur
 * coque. Les dégâts s'accumulent : un vaisseau tombe quand sa coque est
 * entièrement entamée. Les deux camps tirent en même temps.
 *
 * a, d : { race, ships, tech }. Renvoie { attLeft, defLeft, attLost, defLost, won }.
 */
export function battle(a, d) {
  const side = (x) => ({
    race: x.race,
    n: Object.fromEntries(SHIP_KEYS.map((k) => [k, x.ships?.[k] || 0])),
    st: Object.fromEntries(SHIP_KEYS.map((k) => [k, shipStats(x.race, k, x.tech)])),
    dmg: Object.fromEntries(SHIP_KEYS.map((k) => [k, 0])),
  });
  const A = side(a);
  const D = side(d);
  const firepower = (S) => SHIP_KEYS.reduce((t, k) => t + S.n[k] * S.st[k].attack, 0);
  const hitOn = (S, power) => {
    const hulls = SHIP_KEYS.map((k) => S.n[k] * S.st[k].hull);
    const total = hulls.reduce((x, y) => x + y, 0);
    if (!total) return;
    SHIP_KEYS.forEach((k, i) => {
      if (!S.n[k]) return;
      S.dmg[k] += (power * hulls[i]) / total;
      const dead = Math.min(S.n[k], Math.floor(S.dmg[k] / S.st[k].hull + 1e-9));
      S.n[k] -= dead;
      S.dmg[k] -= dead * S.st[k].hull;
    });
  };
  const alive = (S) => SHIP_KEYS.some((k) => S.n[k] > 0);
  for (let round = 0; round < 4 && alive(A) && alive(D); round++) {
    const pa = firepower(A);
    const pd = firepower(D);
    hitOn(D, pa);
    hitOn(A, pd);
  }
  const lost = (before, S) => Object.fromEntries(SHIP_KEYS.map((k) => [k, (before?.[k] || 0) - S.n[k]]).filter(([, v]) => v > 0));
  const left = (S) => Object.fromEntries(SHIP_KEYS.filter((k) => S.n[k] > 0).map((k) => [k, S.n[k]]));
  return {
    attLeft: left(A),
    defLeft: left(D),
    attLost: lost(a.ships, A),
    defLost: lost(d.ships, D),
    won: alive(A) && !alive(D),
  };
}

/**
 * Butin d'une attaque gagnée : jusqu'à la moitié des minéraux et de la
 * nourriture du défenseur, dans la place qui reste dans les soutes des
 * survivants (`carried` : ce qu'elles contiennent déjà).
 */
export function plunder(race, ships, stock, carried = {}) {
  let room = Math.max(0, fleetCargo(race, ships) - SOIL.reduce((t, r) => t + (carried[r] || 0), 0));
  const take = {};
  for (const r of SOIL) {
    const v = Math.floor(Math.min(room, (stock[r] || 0) / 2));
    take[r] = Math.max(0, v);
    room -= take[r];
  }
  return take;
}
