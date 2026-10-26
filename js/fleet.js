// Flottes : vaisseaux en route d'une planète à une autre. Fonctions pures.
//
// Une flotte part d'une planète du joueur avec des vaisseaux et, s'il le
// veut, une cargaison. Trois missions :
//   transport : vers une de ses planètes, où vaisseaux et cargaison restent ;
//   colonie   : vers une planète libre, où un vaisseau colonisateur fonde
//               une colonie (le premier arrivé l'emporte) ;
//   attaque   : vers la planète d'un autre joueur. Combat contre les
//               vaisseaux à quai ; si l'attaquant gagne, il pille ce que ses
//               soutes peuvent emporter, puis les survivants rentrent.
//
// Le trajet est daté (départ, arrivée) : tous les téléphones voient la flotte
// avancer sur la carte, et c'est le téléphone du propriétaire qui applique
// l'arrivée.

import { distance, covers, settle, SOIL } from './game.js';
import { SHIPS, SHIP_KEYS, shipStats } from './tech.js';

export const MAX_FLEETS = 12;
/** Un trajet dure au moins ce temps (ms), même vers la case voisine. */
const MIN_TRIP = 20_000;

export const MISSIONS = {
  transport: { name: 'Transport', verb: 'transporte vers' },
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
  if (!speed) return Infinity;
  return Math.max(MIN_TRIP, Math.round((distance(from, to) / speed) * 60_000));
}

/**
 * Prépare le départ d'une flotte depuis une planète du joueur : retire les
 * vaisseaux et la cargaison de la planète. Renvoie { error } ou { fleet }.
 */
export function launch(planet, { ships, cargo = {}, mission, from, to, target, origin, id }, now) {
  if (!MISSIONS[mission]) return { error: 'Mission inconnue.' };
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
  if (mission === 'colonize' && !clean.colony) return { error: `Il faut un vaisseau colonisateur (${SHIPS[race].colony.name}) pour coloniser.` };
  const load = {};
  for (const r of SOIL) load[r] = Math.max(0, Math.floor(cargo[r] || 0));
  if (load.minerals + load.food > fleetCargo(race, clean)) return { error: 'Les soutes sont trop petites pour cette cargaison.' };
  if (!covers(planet.stock, load)) return { error: 'Pas assez de ressources pour cette cargaison.' };
  const speed = fleetSpeed(race, clean, planet.tech);
  for (const [k, n] of Object.entries(clean)) planet.ships[k] -= n;
  for (const [r, v] of Object.entries(load)) planet.stock[r] -= v;
  const fleet = { id, mission, ships: clean, cargo: load, origin, from, to, target, depart: now, arrive: now + tripMs(from, to, speed) };
  return { fleet };
}

/** Position d'une flotte à l'instant `now` (interpolée entre départ et arrivée). */
export function fleetPos(f, now) {
  const k = Math.min(1, Math.max(0, (now - f.depart) / Math.max(1, f.arrive - f.depart)));
  return { x: f.from.x + (f.to.x - f.from.x) * k, y: f.from.y + (f.to.y - f.from.y) * k };
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
 * nourriture du défenseur, dans la limite des soutes des survivants.
 */
export function plunder(race, ships, stock) {
  let room = fleetCargo(race, ships);
  const take = {};
  for (const r of SOIL) {
    const v = Math.floor(Math.min(room, (stock[r] || 0) / 2));
    take[r] = Math.max(0, v);
    room -= take[r];
  }
  return take;
}
