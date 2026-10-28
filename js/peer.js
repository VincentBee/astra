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

/**
 * Écoute un canal dès sa création et garde les messages arrivés avant qu'on
 * ait branché le Link : sans ça, le tout premier message de l'autre côté
 * (par exemple la demande d'arrivée d'un joueur) peut se perdre.
 */
function earlyBuffer(channel) {
  const early = [];
  channel.onmessage = (e) => early.push(e.data);
  return early;
}

/**
 * Un message ne doit pas dépasser 256 Ko (a=max-message-size, js/invite.js) :
 * au-delà de cette taille de texte (3 octets au plus par caractère), on
 * l'envoie en morceaux, recollés à l'arrivée.
 */
const PART = 60_000;
/** Un message ne dépasse pas 200 morceaux (12 Mo) : bien plus qu'une partie entière. */
const MAX_PARTS = 200;

/** Enveloppe un canal de données : messages JSON, état de connexion. */
export class Link {
  constructor(pc, channel, early = []) {
    this.pc = pc;
    this.channel = channel;
    this.onclose = null;
    this.closed = false;
    this._onmessage = null;
    this._queue = [];
    let parts = null; // { id, n, got: [] } : message en morceaux en cours de réception
    const receive = (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
        if (msg?.type === 'part') {
          // Morceaux numérotés de 0 à n−1, n borné : un numéro énorme bloquerait le téléphone.
          if (!Number.isInteger(msg.n) || msg.n < 1 || msg.n > MAX_PARTS || !Number.isInteger(msg.i) || msg.i < 0 || msg.i >= msg.n) return;
          if (typeof msg.data !== 'string') return;
          if (parts?.id !== msg.id || parts.n !== msg.n) parts = { id: msg.id, n: msg.n, got: [], count: 0 };
          if (parts.got[msg.i] === undefined) parts.count++;
          parts.got[msg.i] = msg.data;
          if (parts.count < parts.n) return;
          msg = JSON.parse(parts.got.join(''));
          parts = null;
        }
      } catch {
        return;
      }
      if (this._onmessage) this._onmessage(msg);
      else this._queue.push(msg);
    };
    early.forEach(receive);
    channel.onmessage = (e) => receive(e.data);
    const close = () => {
      if (this.closed) return;
      this.closed = true;
      this.onclose?.();
    };
    this._close = close;
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

  get onmessage() {
    return this._onmessage;
  }

  /** Brancher un écouteur rejoue d'abord les messages déjà reçus. */
  set onmessage(fn) {
    this._onmessage = fn;
    if (!fn) return;
    const queued = this._queue;
    this._queue = [];
    for (const m of queued) fn(m);
  }

  send(msg) {
    if (this.channel.readyState !== 'open') return;
    const text = JSON.stringify(msg);
    if (text.length <= PART) return this.channel.send(text);
    const id = `${Date.now()}-${Math.random()}`;
    const n = Math.ceil(text.length / PART);
    for (let i = 0; i < n; i++) this.channel.send(JSON.stringify({ type: 'part', id, i, n, data: text.slice(i * PART, (i + 1) * PART) }));
  }

  close() {
    try {
      this.channel.close();
      this.pc.close();
    } catch {}
    this._close(); // prévient tout de suite, sans attendre l'événement du navigateur
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

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(message)), ms))]);
}

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
