import { makeOffer } from '../../../reseau/peer/index.js';

export async function dial(peer, via) {
  if (typeof peer !== 'string' || this.links.has(peer) || this.dialing.has(peer) || peer === this.me) return;
  try {
    const offer = await makeOffer();
    this.dialing.set(peer, offer);
    via.send({ type: 'signal', to: peer, kind: 'offer', sdp: offer.sdp });
    setTimeout(() => {
      if (this.dialing.get(peer) === offer) {
        offer.cancel();
        this.dialing.delete(peer);
      }
    }, 30000);
  } catch {}
}
