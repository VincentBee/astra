import { startShips } from '../../../regles/game/index.js';
import { SHIPS } from '../../../regles/tech/index.js';

/** Lot de vaisseaux au chantier naval d'une de mes planètes. */
export function buildShips(type, count, where = 'home') {
  if (!this.canAct) return;
  const p = this.state.players[this.me];
  const pl = this.myPlanet(where);
  if (!pl) return;
  if (this.queuedBehind(pl)) return this.toPlan('planShips', type, count, where);
  const err = startShips(pl.planet, type, count, this.now());
  if (err) return this.ontoast?.(err);
  this.touch(this.addLog(`${p.name} met en chantier ${count} × ${SHIPS[p.race][type].name} sur ${pl.name}.`));
  this.changed();
}
