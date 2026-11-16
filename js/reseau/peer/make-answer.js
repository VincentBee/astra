import { ICE_SERVERS } from '../config/index.js';
import { earlyBuffer } from './early-buffer.js';
import { failed } from './failed.js';
import { Link } from './link.js';
import { openChannel } from './open-channel.js';
import { waitIce } from './wait-ice.js';
import { withTimeout } from './with-timeout.js';

/** Côté appelé : répond à une offre. `link` se résout quand le canal est ouvert. */
export async function makeAnswer(offerSdp) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channelReady = new Promise((resolve) => (pc.ondatachannel = (e) => resolve({ channel: e.channel, early: earlyBuffer(e.channel) })));
  await pc.setRemoteDescription({ type: 'offer', sdp: offerSdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  const link = withTimeout(
    Promise.race([
      channelReady.then(async ({ channel, early }) => {
        await openChannel(channel);
        return new Link(pc, channel, early);
      }),
      failed(pc),
    ]),
    30000,
    'Connexion entre joueurs impossible.',
  );
  link.catch(() => pc.close());
  return { sdp: pc.localDescription.sdp, link };
}
