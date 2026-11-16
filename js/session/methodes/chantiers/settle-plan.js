import { settle } from '../../../regles/game/index.js';
import { planStartText } from '../../textes/plan-start-text.js';

/** Écrit l'état de la planète maintenant, et note au journal ce que le fil a lancé entre-temps. */
export function settlePlan(p, pl) {
  for (const d of settle(pl.planet, this.now())) if (d.kind === 'start') this.addLog(planStartText(p, d, pl.name));
}
