import { armed } from '../../../fleet.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';

/** Lance une de mes flottes à la poursuite d'une flotte d'un autre joueur, pour la combattre. */
export function chaseFleet(id, pid, targetId) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  const enemy = this.state.players[pid];
  const target = pid !== this.me && this.fleetOf(enemy, targetId);
  if (!f || !target) return this.refuse('Flotte introuvable.');
  if (this.locked(id)) return false;
  if (!this.sees(enemy, target, this.now())) return this.refuse('Cette flotte est hors de ta portée de détection.');
  if (!armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas attaquer.');
  // Ma copie de sa flotte ne change qu'une fois mon rapport lu par son téléphone : d'ici là, ce
  // que je vois est l'état d'avant le combat, et rejouer le combat compterait les pertes deux fois.
  const pendingHit = (p.effects || []).some((e) => e.to === pid && [target.id, ...(target.absorbed || [])].includes(e.fleet) && !enemy.applied?.includes(e.id));
  if (pendingHit) return this.refuse(`Combat déjà livré : en attente du rapport de ${enemy.name}.`);
  f.order = { kind: 'chase', pid, fleet: target.id, seen: null };
  this.tickLogs = []; // un combat immédiat écrit au journal : ses entrées partent avec ma fiche
  this.pursue(p, f, this.now());
  if (f.order) this.addLog(`La flotte ${de(p.name)} prend en chasse une flotte ${de(enemy.name)}.`, { pid: this.me, fleet: f.id }); // D-210
  const logs = this.tickLogs;
  this.tickLogs = null;
  this.touch(logs.length ? logs : null);
  this.changed();
  return true;
}
