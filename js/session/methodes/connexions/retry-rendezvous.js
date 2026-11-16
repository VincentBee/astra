import { RDV_RETRY_MS } from '../../constantes/rdv-retry-ms.js';

/** Rendez-vous raté (réseau coupé au chargement…) : on réessaie toutes les 15 s (#86, D-511). */
export function retryRendezvous(now = performance.now()) {
  if (this.rdv?.state !== 'failed' || now - (this.rdvRetryAt ?? -Infinity) < RDV_RETRY_MS) return;
  this.rdvRetryAt = now;
  this.rdv.refresh();
}
