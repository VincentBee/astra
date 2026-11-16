import { makeAnswer } from '../../../reseau/peer/index.js';

export async function onSignal(link, msg) {
  if (typeof msg.sdp !== 'string' || msg.sdp.length > 8000 || !link.pid) return;
  // Pas pour moi : je relaie au destinataire si je le connais.
  if (msg.to && msg.to !== this.me) {
    this.links.get(msg.to)?.send({ type: 'signal', from: link.pid, kind: msg.kind, sdp: msg.sdp });
    return;
  }
  const from = msg.from;
  if (!from || from === this.me) return;
  try {
    if (msg.kind === 'offer') {
      if (this.links.has(from)) return;
      const ans = await makeAnswer(msg.sdp);
      link.send({ type: 'signal', to: from, kind: 'answer', sdp: ans.sdp });
      const peerLink = await ans.link;
      this.attach(peerLink, from);
      this.changed();
    } else if (msg.kind === 'answer') {
      const offer = this.dialing.get(from);
      if (!offer) return;
      this.dialing.delete(from);
      const peerLink = await offer.connect(msg.sdp);
      this.attach(peerLink, from);
      peerLink.send({ type: 'sync', state: this.snapshot() });
      this.changed();
    }
  } catch {}
}
