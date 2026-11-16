import { together } from '../../../fleet.js';

/** Deux de mes flottes arrêtées ensemble, pour une opération entre elles ; sinon un message. */
export function pairOf(fromId, toId) {
  const a = this.myFleet(fromId);
  const b = this.myFleet(toId);
  if (!a || !b || a === b) return this.refuse('Flotte introuvable.');
  if (this.locked(fromId) || this.locked(toId)) return false;
  if (!together(a, b, this.now())) return this.refuse('Les deux flottes doivent être arrêtées sur la même case.');
  return [a, b];
}
