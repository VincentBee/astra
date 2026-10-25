// Heure de la partie, commune à tous les téléphones.
//
// L'heure de la partie est celle du maître du jeu. Chaque joueur estime son
// décalage avec lui (principe de NTP) : il envoie l'heure t0, le MJ répond
// avec son heure ts, et à la réception (t1) décalage ≈ ts + aller-retour/2 - t1.
// On garde la mesure à l'aller-retour le plus court : la moins faussée par
// les variations de latence (fréquentes en 4G).
//
// Horloge locale monotone (performance.now) : elle ne saute pas si le
// téléphone recale son heure en cours de partie.
//
// Quand un joueur devient MJ, il fige son décalage : l'heure de la partie
// continue sans à-coup, et c'est désormais lui que les autres suivent.

const local = () => performance.timeOrigin + performance.now();

export class Clock {
  constructor() {
    this.offset = 0;
    this.rtt = null;
    this.samples = [];
    this.leading = false;
  }

  /** Heure de la partie, en ms. */
  now() {
    return local() + this.offset;
  }

  /** Ce téléphone devient la référence : le décalage ne bouge plus. */
  lead() {
    this.leading = true;
    this.rtt = null;
  }

  /** Ce téléphone suit un (nouveau) MJ : on repart de zéro pour les mesures. */
  follow() {
    this.leading = false;
    this.samples = [];
  }

  ping() {
    return { type: 'ping', t0: local() };
  }

  onPong(msg) {
    if (this.leading) return;
    const t1 = local();
    const rtt = t1 - msg.t0;
    if (rtt < 0 || rtt > 10000) return;
    this.samples.push({ rtt, offset: msg.ts + rtt / 2 - t1 });
    if (this.samples.length > 8) this.samples.shift();
    const best = this.samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
    this.offset = best.offset;
    this.rtt = Math.round(rtt);
  }
}
