import { sameCell } from '../../../regles/game/index.js';
import { amounts, lacks, noRoom, take, put } from '../../../regles/trade/index.js';
import { de } from '../../textes/de.js';

/**
 * Réponse à une offre. Accepter : je donne ce qu'on me demande et je
 * reçois ce qu'on m'offre, tout de suite (l'autre a déjà mis sa part sous
 * séquestre). Mon téléphone vérifie l'expiration, la case et les places.
 */
export function answerTrade(pid, offerId, ok) {
  if (!this.canAct) return false;
  const me = this.state.players[this.me];
  const other = this.state.players[pid];
  const offer = other?.offers?.find((o) => o.id === offerId);
  const now = this.now();
  if (!offer || offer.to.pid !== this.me) return this.refuse('Offre introuvable.');
  if ((me.answers || []).some((a) => a.offer === offerId && a.pid === pid)) return this.refuse('Déjà répondu.');
  if (ok && offer.to.fleet && this.locked(offer.to.fleet)) return false; // ses soutes sont réservées à son propre échange
  if (ok) {
    if (now >= offer.expires) return this.refuse('Offre expirée.');
    const mine = this.tradeSide(me, offer.to, now);
    const theirs = this.tradeSide(other, offer.from, now);
    if (!mine || !theirs || !sameCell(mine.cell, theirs.cell)) return this.refuse('Les deux parties doivent être arrêtées sur la même case.');
    const want = amounts(offer.want);
    const give = amounts(offer.give);
    const err = lacks(mine.side, me.race, want, now) || noRoom(mine.side, me.race, give, now, want);
    if (err) return this.refuse(err);
    take(mine.side, me.race, want, now);
    put(mine.side, me.race, give, now);
  }
  me.answers = this.keptAnswers([...(me.answers || []), { offer: offerId, pid, ok: !!ok, at: now }]);
  this.touch(this.addLog(`${me.name} ${ok ? 'accepte' : 'refuse'} l’échange ${de(other.name)}.`));
  this.changed();
  return true;
}
