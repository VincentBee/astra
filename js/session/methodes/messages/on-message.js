import { isObj } from '../../fiches/is-obj.js';

export async function onMessage(link, msg) {
  switch (msg.type) {
    case 'hb':
      // w0 : son heure à l'envoi ; w : la mienne à la réponse (D-165).
      return link.send(Number.isFinite(msg.w) ? this.beatMsg('hb-ack', msg.t0, { w0: msg.w }) : { type: 'hb-ack', t0: msg.t0 });
    case 'hb-ack':
      if (Number.isFinite(msg.t0)) link.rtt = Math.round(performance.now() - msg.t0);
      return this.onClock(link, msg);
    case 'clock-changed':
      // Un joueur me dit que mon heure a changé (D-166) : son vote, et ce qu'il sait de moi.
      if (!link.pid || !Number.isFinite(msg.drift) || !this.state) return;
      this.clockVotes[link.pid] = { drift: msg.drift, rec: isObj(msg.rec) ? msg.rec : null };
      return this.checkClock();
    case 'clock-ok':
      if (link.pid) delete this.clockVotes[link.pid];
      return;

    // --- côté hôte (celui qui a invité) ---
    case 'hello':
      return this.onHello(link, msg);

    // --- côté invité ---
    case 'hello-ack':
      if (link === this.firstLink && !this.helloAcked) {
        this.helloAcked = true;
        this.changed();
      }
      return;
    case 'welcome':
      this.helloAcked = true;
      return this.onWelcome(link, msg);
    case 'refused':
      this.helloAcked = true;
      if (this.status === 'waiting') {
        this.status = 'refused';
        this.refusal = msg.reason;
        this.changed();
      }
      return;

    // --- entre tous ---
    case 'sync':
      if (link.pid) this.mergeIn(msg.state, link);
      return;
    case 'rec':
      if (link.pid) this.onRecord(link, msg.rec, msg.log);
      return;
    case 'signal':
      return this.onSignal(link, msg);
    case 'mesh-dial':
      if (link.pid) this.dial(msg.peer, link);
      return;
  }
}
