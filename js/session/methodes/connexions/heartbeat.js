import { SILENCE_MS } from '../../constantes/silence-ms.js';

export function heartbeat() {
  const now = performance.now();
  for (const link of [...this.links.values()]) {
    // Le lien d'une IA de ce téléphone (`local`) ne se coupe jamais pour silence (D-220).
    if (!link.local && now - link.lastSeen > SILENCE_MS) link.close();
    else {
      link.send(this.beatMsg('hb', now));
      link.route?.().then((r) => r && (link.routeType = r));
    }
  }
  if (this.firstLink && !this.firstLink.closed && now - this.firstLink.lastSeen > SILENCE_MS) this.firstLink.close();
  if (this.status === 'playing' && this.state) this.checkClock(); // un votant parti : le consensus a pu changer
  this.retryRendezvous(now);
}
