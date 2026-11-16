import { routeOf } from './route-of.js';

/** Même interface que Link (peer.js), au-dessus d'un pair Trystero. */
export class RoomLink {
  constructor(rdv, peerId) {
    this.rdv = rdv;
    this.peerId = peerId;
    this.closed = false;
    this.onclose = null;
    this.viaRoom = true;
    this._onmessage = null;
    this._queue = [];
  }
  get onmessage() {
    return this._onmessage;
  }
  set onmessage(fn) {
    this._onmessage = fn;
    if (!fn) return;
    const queued = this._queue;
    this._queue = [];
    for (const m of queued) fn(m);
  }
  receive(msg) {
    if (this.closed) return;
    if (this._onmessage) this._onmessage(msg);
    else this._queue.push(msg);
  }
  send(msg) {
    if (!this.closed) this.rdv.sendTo(this.peerId, msg);
  }
  close() {
    this.rdv.drop(this.peerId);
    this._close();
  }
  _close() {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.();
  }
  route() {
    const pc = this.rdv.room?.getPeers?.()[this.peerId];
    return pc ? routeOf(pc) : Promise.resolve(null);
  }
}
