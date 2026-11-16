import { seeded } from '../../../game.js';
import { fleetTank } from '../../../fleet.js';

/**
 * Flotte de départ d'un joueur prêt (D-163) : un colonisateur, le plein fait, sur sa case de
 * départ, à l'heure où il est prêt (au plus tôt au départ). Tout se calcule à partir de la
 * partie (gid, départ, `ready`), identifiant compris : chaque téléphone construit la même.
 */
export function startFleet(p, start = this.startedAt) {
  const r = seeded(`${this.state.gid}/flotte/${p.id}`);
  const id = Array.from({ length: 6 }, () => 'abcdefghijkmnpqrstuvwxyz23456789'[Math.floor(r() * 32)]).join('');
  const ships = { colony: 1 };
  const cell = this.startCell(p, start);
  const at = Math.max(start, p.ready);
  return { id, ships, cargo: { minerals: 0, food: 0 }, fuel: fleetTank(p.race, ships), origin: 'home', from: cell, to: { ...cell }, depart: at, arrive: at, order: null, stance: 'passive' };
}
