import { copyRec } from './copy-rec.js';
import { isObj } from './is-obj.js';
import { LINK } from './link.js';

export class LocalLink {
  constructor() {
    this.peer = null;
    this.closed = false;
    this.viaRoom = false;
    // Même téléphone : même horloge (D-165), et le silence ne veut rien dire, la page était
    // seulement en pause (D-220).
    this.local = true;
    this.queue = [];
    this.handler = null;
    this.closer = null;
  }
  set onmessage(fn) {
    this.handler = fn;
    const q = this.queue;
    this.queue = [];
    if (fn) for (const m of q) fn(m);
  }
  get onmessage() {
    return this.handler;
  }
  /** La fiche livrée est déjà une copie à moi (copyRec) : `onRecord` ne la recopie pas (D-370). */
  get copied() {
    return !LINK.fullCopy;
  }
  set onclose(fn) {
    this.closer = fn;
  }
  get onclose() {
    return this.closer;
  }
  send(msg) {
    if (this.closed) return;
    // Copie faite à l'envoi : la fiche de l'expéditeur peut encore changer avant la livraison.
    let data;
    if (msg?.type === 'rec' && isObj(msg.rec) && !LINK.fullCopy) {
      const { rec, ...rest } = msg;
      data = { ...JSON.parse(JSON.stringify(rest)), rec: copyRec(rec) };
    } else data = JSON.parse(JSON.stringify(msg));
    const peer = this.peer;
    queueMicrotask(() => peer.receive(data));
  }
  receive(msg) {
    if (this.closed) return;
    if (this.handler) this.handler(msg);
    else this.queue.push(msg);
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    const fn = this.closer;
    this.closer = null;
    fn?.();
    this.peer?.close();
  }
  route() {
    return Promise.resolve('bot');
  }
}
