import { moving, refuel, parkedCell } from '../../../fleet.js';

/** Plein d'une de mes flottes, arrêtée sur une de mes planètes, avec l'énergie de celle-ci. */
export function refuelFleet(id) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  const now = this.now();
  if (!f || moving(f, now)) return this.refuse('La flotte doit être arrêtée pour faire le plein.');
  if (this.locked(id)) return false; // son réservoir doit garder la place du carburant échangé
  const here = this.planetsAt(parkedCell(f))[0]; // en panne tout près : elle est en orbite
  const pl = here?.owner.id === this.me && this.planetOf(p, here.key);
  if (!pl) return this.refuse('Le plein se fait en orbite d’une de tes planètes.');
  const give = refuel(pl.planet, f, p.race, now);
  if (!give) return this.refuse('Pas d’énergie à verser, ou réservoirs déjà pleins.');
  this.ontoast?.(`Plein : ${give} d’énergie.`);
  this.touch();
  this.changed();
  return true;
}
