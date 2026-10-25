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
        return new Link(pc, channel);
      })();
      return pending;
    },
    cancel() {
      pc.close();
    },
  };
}

function usedError() {
  const e = new Error('Cette invitation a déjà servi.');
  e.used = true;
  return e;
}

/** Rejette dès que WebRTC abandonne la connexion. */
function failed(pc) {
  return new Promise((_, reject) => {
    const check = () => pc.connectionState === 'failed' && reject(new Error('La connexion ne s’établit pas.'));
    pc.addEventListener('connectionstatechange', check);
    check();
  });
}

/**
 * Joueur : répond à une invitation.
 * Renvoie { code, link: Promise<Link> } ; `code` est la réponse à montrer au MJ.
 * `link` échoue si la connexion n'aboutit pas (WebRTC abandonne, ou 3 minutes
 * sans que le MJ ait scanné la réponse).
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
  const link = withTimeout(
    Promise.race([
      channelReady.then(async (channel) => {
        await openChannel(channel);
        return new Link(pc, channel);
      }),
      failed(pc),
    ]),
    180000,
    'Le maître du jeu n’a pas scanné ta réponse à temps.',
  );
  link.catch(() => pc.close());
  return { code, link, cancel: () => pc.close() };
}

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms))]);
}
