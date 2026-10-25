// Connexions WebRTC sans serveur de signalisation : l'offre et la réponse
// sont transportées à la main (QR code ou lien), en une seule fois chacune.
// On attend donc d'avoir collecté toutes les adresses avant de les encoder.

import { ICE_SERVERS, ICE_GATHER_TIMEOUT_MS } from './config.js';
import { encode, decode } from './invite.js';

function waitIce(pc) {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    };
    const onChange = () => pc.iceGatheringState === 'complete' && done();
    // Sans réponse du STUN (pas d'Internet), on part avec les adresses locales.
    const timer = setTimeout(done, ICE_GATHER_TIMEOUT_MS);
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

/** Enveloppe un canal de données : messages JSON, état de connexion. */
export class Link {
  constructor(pc, channel) {
    this.pc = pc;
    this.channel = channel;
    this.onmessage = null;
    this.onclose = null;
    this.closed = false;
    channel.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.onmessage?.(msg);
    };
    const close = () => {
      if (this.closed) return;
      this.closed = true;
      this.onclose?.();
    };
    channel.onclose = close;
    pc.addEventListener('connectionstatechange', () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        // « disconnected » peut être passager (changement de réseau) :
        // on laisse 5 s à WebRTC pour se rétablir.
        if (pc.connectionState === 'disconnected') {
          setTimeout(() => pc.connectionState === 'disconnected' && close(), 5000);
        } else close();
      }
    });
  }

  send(msg) {
    if (this.channel.readyState === 'open') this.channel.send(JSON.stringify(msg));
  }

  close() {
    try {
      this.channel.close();
      this.pc.close();
    } catch {}
  }

  /** Type de chemin réseau utilisé : direct local, direct Internet ou relais. */
  async route() {
    try {
      const stats = await this.pc.getStats();
      let pair;
      stats.forEach((s) => {
        if (s.type === 'transport' && s.selectedCandidatePairId) pair = stats.get(s.selectedCandidatePairId);
      });
      if (!pair) stats.forEach((s) => s.type === 'candidate-pair' && s.nominated && s.state === 'succeeded' && (pair = s));
      const local = pair && stats.get(pair.localCandidateId);
      return local ? local.candidateType : null; // host | srflx | prflx | relay
    } catch {
      return null;
    }
  }
}

function openChannel(channel) {
  return new Promise((resolve, reject) => {
    if (channel.readyState === 'open') return resolve();
    channel.addEventListener('open', () => resolve(), { once: true });
    channel.addEventListener('error', () => reject(new Error('Canal fermé')), { once: true });
  });
}

/**
 * MJ : prépare une invitation.
 * Renvoie { code, accept(answerCode) -> Promise<Link>, cancel() }.
 */
export async function createInvite() {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channel = pc.createDataChannel('astra', { ordered: true });
  await pc.setLocalDescription(await pc.createOffer());
  await waitIce(pc);
  const code = await encode('o', pc.localDescription.sdp);
  return {
    code,
    async accept(answerInput) {
      const { kind, sdp } = await decode(answerInput);
      if (kind !== 'a') throw new Error("C'est une invitation, pas une réponse. Scanne le QR affiché par le joueur.");
      await pc.setRemoteDescription({ type: 'answer', sdp });
      await withTimeout(openChannel(channel), 20000, 'La connexion ne s’établit pas. Vérifie que les deux téléphones ont du réseau, puis recommence.');
      return new Link(pc, channel);
    },
    cancel() {
      pc.close();
    },
  };
}

/**
 * Joueur : répond à une invitation.
 * Renvoie { code, link: Promise<Link> } ; `code` est la réponse à montrer au MJ.
 */
export async function answerInvite(offerInput) {
  const { kind, sdp } = await decode(offerInput);
  if (kind !== 'o') throw new Error("C'est une réponse de joueur, pas une invitation du MJ.");
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  const channelReady = new Promise((resolve) => (pc.ondatachannel = (e) => resolve(e.channel)));
  await pc.setRemoteDescription({ type: 'offer', sdp });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIce(pc);
  const code = await encode('a', pc.localDescription.sdp);
  const link = channelReady.then(async (channel) => {
    await openChannel(channel);
    return new Link(pc, channel);
  });
  return { code, link, cancel: () => pc.close() };
}

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms))]);
}
