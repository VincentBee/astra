import { covers, settle, SOIL } from '../../../game.js';
import { SHIPS, SHIP_KEYS } from '../../../tech.js';
import { countShips } from '../caracteristiques/count-ships.js';
import { fleetCargo } from '../caracteristiques/fleet-cargo.js';
import { fleetTank } from '../caracteristiques/fleet-tank.js';

/**
 * Décollage depuis une planète du joueur : retire les vaisseaux et la
 * cargaison de la planète. La flotte attend en orbite, sur la case de la
 * planète. Renvoie { error } ou { fleet }.
 */
export function launch(planet, { ships, cargo = {}, fuel = 0, at, origin, id }, now) {
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
  const gas = Math.max(0, Math.floor(fuel || 0));
  if (gas > fleetTank(race, clean)) return { error: 'Les réservoirs sont trop petits pour ce carburant.' };
  if (!covers(planet.stock, { energy: gas })) return { error: 'Pas assez d’énergie pour ce carburant.' };
  for (const [k, n] of Object.entries(clean)) planet.ships[k] -= n;
  for (const [r, v] of Object.entries(load)) planet.stock[r] -= v;
  planet.stock.energy -= gas;
  const cell = { x: at.x, y: at.y };
  const fleet = { id, ships: clean, cargo: load, fuel: gas, origin, from: cell, to: { ...cell }, depart: now, arrive: now, order: null, stance: 'passive' };
  return { fleet };
}
