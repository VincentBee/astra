import { SKEW_SAMPLES } from '../../constantes/skew-samples.js';
import { median } from '../../horloge/median.js';

/**
 * Réponse à un battement (D-165, D-166) : écart entre l'heure de ce joueur et la mienne, comme
 * NTP (son heure à la réponse, moins le milieu de l'aller-retour à mon heure), médiane des 5
 * derniers. Toute heure est acceptée :
 * - je n'ai pas l'heure commune et lui l'a : je la prends (clockOff += écart) ;
 * - tous deux l'avons : l'écart attendu est 0 ; sinon, le premier écart mesuré est la référence ;
 * - au-delà de CLOCK_DRIFT_MS de l'attendu, son heure a changé : je le lui dis (`clock-changed`,
 *   avec ce que je sais de lui), une fois, et `clock-ok` quand c'est revenu.
 * Un téléphone d'avant ne renvoie pas son heure (`noClock`) : rien à comparer.
 */
export function onClock(link, msg) {
  if (!Number.isFinite(msg.w) || !Number.isFinite(msg.w0)) {
    link.noClock = true;
    return;
  }
  const pid = link.pid;
  if (!pid || link.local) return; // une IA a l'horloge de ce téléphone
  if (msg.ep !== link.ep) {
    // Il a corrigé son heure : on recommence à le mesurer.
    Object.assign(link, { ep: msg.ep, skews: [], skew: undefined, driftSent: false });
    delete this.clockRef[pid];
    delete this.clockVotes[pid]; // ses votes dataient d'avant sa correction
  }
  link.sy = !!msg.sy;
  const sample = msg.w - (msg.w0 + this.clock()) / 2;
  if (!this.clockSynced && link.sy) {
    this.clockSynced = true;
    return this.shiftClock(Math.round(sample));
  }
  link.skews = [...(link.skews || []), sample].slice(-SKEW_SAMPLES);
  link.skew = Math.round(median(link.skews));
  if (link.skews.length < 3) return; // 3 mesures avant de juger
  if (!(this.clockSynced && link.sy) && !Number.isFinite(this.clockRef[pid])) this.clockRef[pid] = link.skew;
  const changed = this.clockState(link) === 'drift';
  if (!changed && this.clockPending[pid]) this.clockTrust[pid] = this.clockPending[pid];
  if (!changed) delete this.clockPending[pid];
  if (changed && !link.driftSent) {
    const rec = this.clockTrust[pid];
    const { online, ...data } = rec || {};
    link.send({ type: 'clock-changed', drift: this.clockDrift(link), ...(rec ? { rec: data } : {}) });
  } else if (!changed && link.driftSent) link.send({ type: 'clock-ok' });
  link.driftSent = changed;
}
