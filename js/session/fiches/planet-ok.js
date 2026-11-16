import { PLAN_MAX, planItem, RACES, SOIL, RES } from '../../regles/game/index.js';
import { amount } from './amount.js';
import { isObj } from './is-obj.js';

/**
 * Planète utilisable : stock, niveaux, et un chantier en cours sur un vrai bâtiment de sa race.
 * Une heure `at` d'avant `floor` (la planète n'existait pas encore) est ramenée à `floor` (D-175).
 */
export function planetOk(race, pl, floor = -Infinity) {
  if (!isObj(pl) || !isObj(pl.stock) || !isObj(pl.levels) || !Number.isFinite(pl.at)) return false;
  if (pl.at < floor) pl.at = floor;
  // Stock et population (#76) : un nombre fini et au moins 0, sinon 0. Une clé absente ou une
  // chaîne rendait toute l'économie NaN pour toujours ; un stock négatif, une famine immédiate.
  for (const r of RES) pl.stock[r] = amount(pl.stock[r]);
  if (pl.pop !== undefined) pl.pop = amount(pl.pop);
  // Gisements : pour chaque ressource du sol, un maximum et une repousse, et ce qu'il en reste.
  const soilOk = isObj(pl.nature) && isObj(pl.reserve) && SOIL.every((r) => !pl.nature[r] || (isObj(pl.nature[r]) && Number.isFinite(pl.nature[r].max) && Number.isFinite(pl.nature[r].regen) && Number.isFinite(pl.reserve[r])));
  if (!soilOk) {
    delete pl.nature;
    delete pl.reserve;
  } else {
    // Une réserve ou une repousse négative faisait perdre des minéraux à la planète (#76).
    for (const r of SOIL) {
      if (!pl.nature[r]) continue;
      pl.nature[r].regen = Math.max(0, pl.nature[r].regen);
      pl.reserve[r] = Math.max(0, pl.reserve[r]);
    }
  }
  if (pl.climate !== undefined && !(isObj(pl.climate) && ['heat', 'energy', 'minerals', 'food'].every((k) => Number.isFinite(pl.climate[k])))) delete pl.climate;
  if (pl.places !== undefined && !(Number.isInteger(pl.places) && pl.places > 0)) delete pl.places;
  if (pl.queue && !(isObj(pl.queue) && race && Object.hasOwn(RACES[race].buildings, pl.queue.key))) pl.queue = null;
  // Fil d'attente : bâtiments, recherches et lots de vaisseaux de la race (D-158), PLAN_MAX au plus.
  if (pl.plan !== undefined) pl.plan = Array.isArray(pl.plan) && race ? pl.plan.map((x) => planItem(race, x)).filter(Boolean).slice(0, PLAN_MAX) : [];
  // Niveaux : seulement les bâtiments de la race, en entiers positifs (un niveau négatif libérerait des places).
  if (race) pl.levels = Object.fromEntries(Object.keys(RACES[race].buildings).map((k) => [k, Math.max(0, Math.floor(Number(pl.levels[k]) || 0))]));
  return true;
}
