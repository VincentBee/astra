import { CLOCK_DRIFT_MS } from '../../constantes/clock-drift-ms.js';

/**
 * Fiche de `pid` adoptée : gardée comme sûre si son heure est juste, en attente si pas encore
 * mesurée. Sans lien direct avec lui (fiche relayée, ou reçue avant que son lien soit branché) :
 * sûre seulement si elle n'est pas datée de mon futur.
 */
export function afterRec(pid) {
  const link = this.links.get(pid);
  const p = this.state.players[pid];
  const st = link ? this.clockState(link) : (p?.actAt || 0) <= this.now() + CLOCK_DRIFT_MS ? 'ok' : 'wait';
  if (st === 'ok') this.clockTrust[pid] = this.state.players[pid];
  else if (st === 'wait') this.clockPending[pid] = this.state.players[pid];
}
