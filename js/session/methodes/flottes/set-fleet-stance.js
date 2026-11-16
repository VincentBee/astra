import { STANCES, armed } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';

/** Comportement en voyage d'une de mes flottes : 'passive' ou 'aggressive' (STANCES). */
export function setFleetStance(id, stance) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  if (!f || !STANCES[stance]) return false;
  if (stance === 'aggressive' && !armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas être agressive.');
  if ((f.stance || 'passive') === stance) return false;
  f.stance = stance;
  this.tickLogs = []; // une flotte ennemie déjà au contact : le combat part avec ma fiche
  this.engage(p, f, this.now());
  const logs = this.tickLogs;
  this.tickLogs = null;
  this.touch(logs.length ? logs : null);
  this.changed();
  return true;
}
