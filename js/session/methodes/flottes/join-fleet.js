import { moveTo, together } from '../../../regles/fleet/index.js';
import { techOf } from '../../outils/tech-of.js';
import { de } from '../../textes/de.js';

/**
 * Envoie ma flotte `id` rejoindre une autre de mes flottes, `intoId`, pour
 * s'y fondre à l'arrivée (D-159) : elle vise la case où l'autre attend, ou
 * celle où elle va. Déjà ensemble, arrêtées sur la même case : la fusion est
 * immédiate (`intoId` absorbe `id`).
 */
export function joinFleet(id, intoId) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const f = this.myFleet(id);
  const g = this.myFleet(intoId);
  if (!f || !g || f === g) return this.refuse('Flotte introuvable.');
  if (this.locked(id) || this.locked(intoId)) return false;
  const now = this.now();
  if (together(f, g, now)) return this.mergeFleets(id, intoId);
  const was = this.shuttlesOf([f]);
  const err = moveTo(f, p.race, techOf(p), { ...g.to }, { kind: 'join', fleet: g.id }, now);
  if (err) return this.refuse(err);
  if (f.stranded) this.ontoast?.('Pas assez de carburant : la flotte tombera en panne en route.');
  this.touch(this.quitShuttles(p, was, this.addLog(`Une flotte ${de(p.name)} part rejoindre une autre de ses flottes en [${g.to.x}:${g.to.y}].`)));
  this.changed();
  return true;
}
