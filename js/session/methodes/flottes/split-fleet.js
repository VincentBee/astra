import { moving, split, MAX_FLEETS } from '../../../regles/fleet/index.js';

/** Scinde une de mes flottes arrêtées : `part` forme une nouvelle flotte, au même endroit. */
export function splitFleet(id, part) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  const now = this.now();
  if (!f) return this.refuse('Flotte introuvable.'); // disparue (combat, fusion, élimination) : on le dit (#73)
  if (this.locked(id)) return false;
  if (moving(f, now)) return this.refuse('La flotte doit être arrêtée pour se scinder.');
  if (p.fleets.length >= MAX_FLEETS) return this.refuse(`Pas plus de ${MAX_FLEETS} flottes.`);
  const was = this.shuttlesOf([f]);
  const res = split(f, p.race, part, this.newId(6), now);
  if (res.error) return this.refuse(res.error);
  p.fleets.push(res.fleet);
  this.touch(this.quitShuttles(p, was, null, 'flotte scindée'));
  this.changed();
  return res.fleet.id;
}
