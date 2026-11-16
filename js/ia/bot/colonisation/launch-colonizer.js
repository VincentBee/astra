import { distance } from '../../../regles/game/index.js';
import { SHIPS } from '../../../regles/tech/index.js';
import { fleetTank, fleetBurn, MAX_FLEETS } from '../../../regles/fleet/index.js';
import { colonyTargets } from './colony-targets.js';

/** Un colonisateur posé sur une planète : il décolle avec une cargaison de départ, puis part. */
export function launchColonizer(ctx, pl, st) {
  if (ctx.left < 2 || !(st.ships?.colony > 0) || (ctx.p.fleets || []).length >= MAX_FLEETS) return;
  const race = ctx.p.race;
  const target = colonyTargets(ctx, pl.cell)[0];
  if (!target) return;
  const ships = { colony: 1 };
  const fuel = Math.min(fleetTank(race, ships), Math.ceil(fleetBurn(race, ships) * distance(pl.cell, target) * 1.1) + 2, Math.floor(st.stock.energy || 0));
  if (fleetBurn(race, ships) * distance(pl.cell, target) > fuel) return;
  // De quoi lancer les premiers chantiers de la colonie, sans vider la planète.
  const room = SHIPS[race].colony.cargo;
  const minerals = Math.max(0, Math.min(room, Math.floor((st.stock.minerals || 0) / 3)));
  const food = race === 'machine' ? 0 : Math.max(0, Math.min(room - minerals, Math.floor((st.stock.food || 0) / 4)));
  let id = null;
  ctx.order(() => (id = ctx.s.takeOff(pl.key, ships, { minerals, food }, fuel)));
  if (id) ctx.order(() => ctx.s.moveFleet(id, { x: target.x, y: target.y }, 'colonize'));
}
