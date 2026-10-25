// Côté joueur : affiche l'état reçu du MJ, envoie des ordres, et anime
// localement ressources et chantiers avec l'heure synchronisée sur le MJ.

import { answerInvite } from './peer.js';
import { Clock } from './clock.js';

const REJOIN_KEY = 'astra.rejoin';

function loadRejoin() {
  try {
    return JSON.parse(sessionStorage.getItem(REJOIN_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveRejoin(v) {
  try {
    sessionStorage.setItem(REJOIN_KEY, JSON.stringify(v));
  } catch {}
}

export class PlayerSession {
  constructor(name) {
    this.role = 'player';
    this.name = name;
    this.clock = new Clock();
    this.me = null;
    this.gid = null;
    this._state = { players: {}, log: [] };
    this.link = null;
    this.status = 'idle'; // idle | answering | waiting | playing | lost | refused | ended
    this.onchange = null;
    this.ontoast = null;
    this.route = null;
  }

  now() {
    return this.clock.now();
  }

  get state() {
    return this._state;
  }

  /** Lit l'invitation du MJ et renvoie le code-réponse à lui montrer. */
  async answer(offer) {
    this.pendingAnswer?.cancel();
    const ans = await answerInvite(offer);
    this.pendingAnswer = ans;
    this.status = 'answering';
    ans.link.then(
      (link) => this.onLink(link),
      (e) => {
        if (this.pendingAnswer !== ans) return;
        this.pendingAnswer = null;
        this.status = 'failed';
        this.failure = e.message;
        this.changed();
      },
    );
    return ans.code;
  }

  onLink(link) {
    this.pendingAnswer = null;
    this.link = link;
    this.status = 'waiting';
    const back = loadRejoin();
    link.onmessage = (msg) => this.onMessage(msg);
    link.onclose = () => {
      if (this.link !== link) return;
      clearInterval(this.pinger);
      if (this.status === 'playing') this.status = 'lost';
      this.changed();
    };
    link.send({ type: 'hello', name: this.name, pid: back?.pid, gid: back?.gid });
    // Rafale de mesures au départ, puis une toutes les 2 s.
    let n = 0;
    const tick = () => {
      link.send(this.clock.ping());
      if (++n === 6) {
        clearInterval(this.pinger);
        this.pinger = setInterval(tick, 2000);
      }
    };
    this.pinger = setInterval(tick, 150);
    this.changed();
  }

  async onMessage(msg) {
    switch (msg.type) {
      case 'pong':
        this.clock.onPong(msg);
        if (this.status === 'playing') {
          this.route = (await this.link.route()) || this.route;
          this.link.send({ type: 'status', rtt: this.clock.rtt, route: this.route });
        }
        return;
      case 'welcome':
        this.me = msg.you;
        this.gid = msg.gid;
        this._state = msg.state;
        this.status = 'playing';
        saveRejoin({ pid: msg.you, gid: msg.gid });
        return this.changed();
      case 'state':
        this._state = msg.state;
        return this.changed();
      case 'error':
        return this.ontoast?.(msg.message);
      case 'refused':
        this.status = 'refused';
        this.refusal = msg.reason;
        return this.changed();
      case 'ended':
        this.status = 'ended';
        return this.changed();
    }
  }

  build(key) {
    if (this.status !== 'playing') return;
    this.link.send({ type: 'build', key });
  }

  changed() {
    this.onchange?.('state');
  }

  end() {
    clearInterval(this.pinger);
    this.pendingAnswer?.cancel();
    this.link?.close();
  }
}
