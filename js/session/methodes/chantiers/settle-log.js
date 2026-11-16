import { settle } from '../../../regles/game/index.js';
import { planStartText } from '../../textes/plan-start-text.js';
import { autoLog } from '../../textes/auto-log.js';

/**
 * Écrit la planète `pl` (une des miennes) à l'heure `at`, et note au journal ce que le fil a
 * lancé et ce que l'achat automatique a reçu entre-temps (D-531) : tout `settle` d'une de mes
 * planètes passe par ici, sinon des vaisseaux de la règle entreraient dans la fiche sans une
 * ligne. Renvoie ce qui s'est passé (`done` de settle).
 */
export function settleLog(p, pl, at = this.now()) {
    const done = settle(pl.planet, at);
    for (const d of done) if (d.kind === 'start' && !d.auto) this.addLog(planStartText(p, d, pl.name));
    autoLog(this, p, pl, done);
    return done;
  }
