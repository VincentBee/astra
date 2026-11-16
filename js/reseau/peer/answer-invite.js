import { ICE_SERVERS } from '../config/index.js';
import { encode, decode } from '../invite/index.js';
import { earlyBuffer } from './early-buffer.js';
import { failed } from './failed.js';
import { Link } from './link.js';
import { openChannel } from './open-channel.js';
import { waitIce } from './wait-ice.js';
import { withTimeout } from './with-timeout.js';

/**
 * Joueur : répond à une invitation.
 * Renvoie { code, link: Promise<Link> } ; `code` est la réponse à montrer à l'hôte.
 * `link` échoue si la connexion n'aboutit pas (WebRTC abandonne, ou 3 minutes
 * sans que l'hôte ait scanné la réponse).
 */
export async function answerInvite(offerInput) {
  const { kind, sdp } = await decode(offerInput);
  if (kind !== 'o') throw new Error("C'est une réponse de joueur, pas une invitation.");
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channelReady = new Promise((resolve) => (pc.ondatachannel = (e) => resolve({ channel: e.channel, early: earlyBuffer(e.channel) })));
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  const code = await encode('a', pc.localDescription.sdp);
  const link = withTimeout(
    Promise.race([
      channelReady.then(async ({ channel, early }) => {
        await openChannel(channel);
        return new Link(pc, channel, early);
      }),
      failed(pc),
    ]),
    180000,
    'La personne qui t’invite n’a pas scanné ta réponse à temps.',
  );
  link.catch(() => pc.close());
  return { code, link, cancel: () => pc.close() };
}
