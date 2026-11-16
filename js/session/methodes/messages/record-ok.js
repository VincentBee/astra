import { isObj } from '../../fiches/is-obj.js';
import { pidOk } from '../../fiches/pid-ok.js';

/**
 * Une fiche d'un autre téléphone est-elle acceptable ? Personne d'autre que
 * moi n'écrit la mienne ; le secret d'un joueur ne change jamais ; une fiche
 * datée loin dans le futur bloquerait les vraies (elles paraîtraient plus vieilles).
 */
export function recordOk(pid, rec) {
  if (!pidOk(pid) || !isObj(rec) || rec.id !== pid || pid === this.me) return false;
  // Un téléphone peut être en avance de quelques minutes ou heures (horloge mal réglée) : seule une
  // date absurde (plus d'un jour d'avance) est refusée, elle figerait sa fiche chez tout le monde.
  if (!(Number.isFinite(rec.actAt) || rec.actAt === undefined) || (rec.actAt || 0) > this.now() + 24 * 3_600_000) return false;
  const ours = this.state?.players[pid];
  // Installation antidatée : une planète que sa fiche ne montrait pas encore quand je l'ai vue,
  // mais datée d'avant cette fiche. Une vraie installation est toujours datée d'après.
  if (ours && (rec.actAt || 0) > (ours.actAt || 0) && this.backdated(ours, rec)) return false; // une fiche plus vieille est ignorée de toute façon
  if (ours?.secretHash && rec.secretHash !== ours.secretHash) return false;
  return true;
}
