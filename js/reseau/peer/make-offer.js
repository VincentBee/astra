import { ICE_SERVERS } from '../config/index.js';
import { earlyBuffer } from './early-buffer.js';
import { failed } from './failed.js';
import { Link } from './link.js';
import { openChannel } from './open-channel.js';
import { waitIce } from './wait-ice.js';
import { withTimeout } from './with-timeout.js';

// ---------------------------------------------------------------------------
// Connexions entre joueurs : l'offre et la réponse (SDP complet) passent par
// un canal déjà ouvert (celui du joueur qui fait les présentations), donc pas besoin de les compresser.
// ---------------------------------------------------------------------------

/** Côté qui appelle : prépare une offre. `connect(answerSdp)` ouvre le canal. */
export async function makeOffer() {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('astra', { ordered: true });
  const early = earlyBuffer(channel);
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  return {
    sdp: pc.localDescription.sdp,
    async connect(answerSdp) {
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
      await withTimeout(Promise.race([openChannel(channel), failed(pc)]), 25000, 'Connexion entre joueurs impossible.');
      return new Link(pc, channel, early);
    },
    cancel: () => pc.close(),
  };
}
