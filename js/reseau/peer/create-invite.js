import { ICE_SERVERS } from '../config/index.js';
import { encode, decode } from '../invite/index.js';
import { earlyBuffer } from './early-buffer.js';
import { failed } from './failed.js';
import { Link } from './link.js';
import { openChannel } from './open-channel.js';
import { usedError } from './used-error.js';
import { waitIce } from './wait-ice.js';
import { withTimeout } from './with-timeout.js';

/**
 * Hôte (n'importe quel joueur) : prépare une invitation.
 * Renvoie { code, accept(answerCode) -> Promise<Link>, cancel() }.
 */
export async function createInvite() {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('astra', { ordered: true });
  const early = earlyBuffer(channel);
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  const code = await encode('o', pc.localDescription.sdp);
  let pending = null; // connexion en cours avec une réponse donnée
  let pendingUfrag = null;
  return {
    code,
    /** true si une réponse a déjà été appliquée à cette invitation. */
    get used() {
      return pending !== null;
    },
    async accept(answerInput) {
      const { kind, sdp } = await decode(answerInput);
      if (kind !== 'a') throw new Error("C'est une invitation, pas une réponse. Scanne le QR affiché par le joueur.");
      const ufrag = (/a=ice-ufrag:(\S+)/.exec(sdp) || [])[1];
      if (pending) {
        // La même réponse scannée deux fois : on attend la connexion déjà en cours.
        if (ufrag === pendingUfrag) return pending;
        throw usedError();
      }
      if (pc.signalingState !== 'have-local-offer') throw usedError();
      pendingUfrag = ufrag;
      pending = (async () => {
        await pc.setRemoteDescription({ type: 'answer', sdp });
        await withTimeout(
          Promise.race([openChannel(channel), failed(pc)]),
          25000,
          'La connexion ne s’établit pas.',
        );
        return new Link(pc, channel, early);
      })();
      return pending;
    },
    cancel() {
      pc.close();
    },
  };
}
