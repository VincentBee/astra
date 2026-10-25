// Synchronisation sur l'horloge du MJ (principe de NTP).
//
// Le joueur envoie l'heure t0 ; le MJ répond avec son heure ts ; à la
// réception (t1), décalage ≈ ts + aller-retour/2 - t1. On garde la mesure
// faite avec l'aller-retour le plus court parmi les dernières : c'est la
// moins faussée par les variations de latence (fréquentes en 4G).

export class Clock {
  constructor() {
    this.offset = 0;
    this.rtt = null;
    this.samples = [];
    this.synced = false;
  }

  /** Heure du MJ estimée, en ms. */
  now() {
    return Date.now() + this.offset;
  }

  ping() {
    return { type: 'ping', t0: Date.now() };
  }

  onPong(msg) {
    const t1 = Date.now();
    const rtt = t1 - msg.t0;
    if (rtt < 0 || rtt > 10000) return;
    this.samples.push({ rtt, offset: msg.ts + rtt / 2 - t1 });
    if (this.samples.length > 8) this.samples.shift();
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.offset = best.offset;
    this.rtt = rtt;
    this.synced = true;
  }
}
