import { ICE_SERVERS, relayUrls } from '../config/index.js';
import { ACTION } from './action.js';
import { APP_ID } from './app-id.js';
import { loadLib } from './load-lib.js';
import { RoomLink } from './room-link.js';

export class Rendezvous {
  /**
   * `onLink(link, pid)` est appelé pour chaque joueur de la partie trouvé
   * au rendez-vous, une fois qu'il s'est présenté.
   */
  constructor({ gid, key, me, onLink }) {
    this.gid = gid;
    this.key = key;
    this.me = me;
    this.onLink = onLink;
    this.peers = new Map(); // peerId Trystero -> RoomLink
    this.room = null;
    this.state = 'off'; // off | joining | on | failed
    this.left = false;
  }

  async join() {
    this.left = false;
    this.state = 'joining';
    let joinRoom;
    try {
      ({ joinRoom } = await loadLib());
    } catch {
      this.state = 'failed';
      return;
    }
    if (this.left) return;
    const urls = relayUrls();
    try {
      this.room = joinRoom(
        {
          appId: APP_ID,
          password: this.key,
          rtcConfig: { iceServers: ICE_SERVERS },
          ...(urls ? { relayConfig: { urls, redundancy: urls.length } } : {}),
        },
        `g-${this.gid}`,
      );
    } catch {
      this.state = 'failed';
      return;
    }
    const action = this.room.makeAction(ACTION);
    this._send = (data, target) => Promise.resolve(action.send(data, { target })).catch(() => {});
    action.onMessage = (data, meta) => this.onData(data, meta?.peerId);
    this.room.onPeerJoin = (peerId) => this.onPeerJoin(peerId);
    this.room.onPeerLeave = (peerId) => this.onPeerLeave(peerId);
    this.state = 'on';
  }

  onPeerJoin(peerId) {
    this.peers.get(peerId)?._close();
    const link = new RoomLink(this, peerId);
    this.peers.set(peerId, link);
    // Présentation, renvoyée jusqu'à celle de l'autre (le premier message
    // peut partir avant que l'autre côté écoute).
    const hello = () => !link.pid && !link.closed && this.sendTo(peerId, { type: 'rdv-hello', gid: this.gid, pid: this.me });
    hello();
    link.helloTimer = setInterval(() => (link.pid || link.closed ? clearInterval(link.helloTimer) : hello()), 1000);
  }

  onPeerLeave(peerId) {
    const link = this.peers.get(peerId);
    this.peers.delete(peerId);
    link?._close();
  }

  onData(msg, peerId) {
    const link = this.peers.get(peerId);
    if (!link || !msg || typeof msg !== 'object') return;
    if (msg.type === 'rdv-hello') {
      if (link.pid) return;
      if (msg.gid !== this.gid || typeof msg.pid !== 'string' || msg.pid === this.me) return link.close();
      link.pid = msg.pid;
      clearInterval(link.helloTimer);
      // L'autre attend peut-être encore ma présentation.
      this.sendTo(peerId, { type: 'rdv-hello', gid: this.gid, pid: this.me });
      return this.onLink(link, msg.pid);
    }
    if (link.pid) link.receive(msg);
  }

  sendTo(peerId, msg) {
    try {
      this._send?.(msg, peerId);
    } catch {}
  }

  /** Coupe la connexion WebRTC avec ce pair (il pourra revenir). */
  drop(peerId) {
    const pc = this.room?.getPeers?.()[peerId];
    this.peers.delete(peerId);
    try {
      pc?.close();
    } catch {}
  }

  /** Repart de zéro : s'annonce tout de suite (au réveil du téléphone). */
  async refresh() {
    if (this.state === 'joining') return;
    this.leave();
    await this.join();
  }

  leave() {
    this.left = true;
    for (const link of this.peers.values()) {
      clearInterval(link.helloTimer);
      link._close();
    }
    this.peers.clear();
    try {
      this.room?.leave();
    } catch {}
    this.room = null;
    this.state = 'off';
  }
}
