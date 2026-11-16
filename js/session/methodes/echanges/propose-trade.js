import { sameCell } from '../../../game.js';
import { amounts, isEmpty, lacks, noRoom, take, OFFER_MS, MAX_OFFERS } from '../../../trade.js';

/**
 * Propose un échange : ce que je donne part sous séquestre tout de suite,
 * l'offre vaut OFFER_MS et ne s'annule pas. La flotte qui propose est
 * bloquée jusqu'à la réponse.
 */
export function proposeTrade(fromRef, toRef, giveIn, wantIn) {
  if (!this.canAct) return false;
  const p = this.state.players[this.me];
  const other = this.state.players[toRef?.pid];
  const now = this.now();
  const give = amounts(giveIn);
  const want = amounts(wantIn);
  if (!other || other.id === this.me) return this.refuse('Joueur introuvable.');
  if (isEmpty(give) && isEmpty(want)) return this.refuse('Choisis ce que tu donnes ou ce que tu demandes.');
  if (fromRef.fleet && this.locked(fromRef.fleet)) return false;
  if ((p.offers || []).length >= MAX_OFFERS) return this.refuse(`Pas plus de ${MAX_OFFERS} échanges en attente.`);
  const mine = this.tradeSide(p, fromRef, now);
  const theirs = this.tradeSide(other, toRef, now);
  if (!mine || !theirs || !sameCell(mine.cell, theirs.cell)) return this.refuse('Les deux parties doivent être arrêtées sur la même case.');
  const err = lacks(mine.side, p.race, give, now) || noRoom(mine.side, p.race, want, now, give);
  if (err) return this.refuse(err);
  take(mine.side, p.race, give, now);
  const offer = { id: this.newId(8), from: fromRef, to: toRef, give, want, at: now, expires: now + OFFER_MS };
  p.offers = [...(p.offers || []), offer];
  this.touch(this.addLog(`${p.name} propose un échange à ${other.name}.`));
  this.changed();
  return offer.id;
}
