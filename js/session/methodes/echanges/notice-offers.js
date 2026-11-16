/** Nouvelle offre pour moi : un message, une fois. */
export function noticeOffers(now) {
  this.seenOffers ||= new Set();
  for (const { from, offer } of this.incomingOffers()) {
    if (this.seenOffers.has(offer.id)) continue;
    this.seenOffers.add(offer.id);
    if (now < offer.expires) this.ontoast?.(`${from.name} te propose un échange (carte).`);
  }
}
