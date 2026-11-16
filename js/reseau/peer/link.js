import { MAX_PARTS } from './max-parts.js';
import { PART } from './part.js';

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
