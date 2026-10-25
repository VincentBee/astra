// Une partie vue depuis un téléphone. Tous les téléphones font tourner le même
// code et gardent une copie complète de la partie ; l'un d'eux est le maître
// du jeu (MJ) du moment.
//
// - Le MJ fait foi : il valide les ordres, fixe l'heure de la partie et
//   diffuse l'état à tout le monde.
// - Chaque joueur est connecté au MJ ET aux autres joueurs (le MJ fait les
//   présentations en relayant les offres WebRTC).
// - Si le MJ disparaît, le plus ancien joueur encore en ligne devient MJ et
//   reprend la partie depuis sa copie. Tant qu'il reste quelqu'un, la partie
//   continue, même seul.
// - Chaque changement de MJ ouvre une nouvelle « époque » ; en cas de
//   désaccord, l'époque la plus récente l'emporte, puis le plus ancien.

import { createInvite, answerInvite, makeOffer, makeAnswer } from './peer.js';
import { Clock } from './clock.js';
import { newPlanet, settle, startBuild, BUILDINGS, step, freeCell, DIRS, MOVE_COOLDOWN } from './game.js';

const COLORS = ['#7aa2ff', '#ff9f6b', '#7cf0b4', '#f7d06b', '#d38bff', '#6fd3ff', '#ff7a93', '#b7e36b'];
const MAX_PLAYERS = 8;
const HEARTBEAT_MS = 1500;
const SILENCE_MS = 6000; // sans nouvelles depuis 6 s : la connexion est considérée perdue
const ID_KEY = 'astra.identity';

function rid(n = 8) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

const loadIdentity = () => {
  try {
    return JSON.parse(localStorage.getItem(ID_KEY) || 'null');
  } catch {
    return null;
  }
};
const saveIdentity = (v) => {
  try {
    localStorage.setItem(ID_KEY, JSON.stringify(v));
  } catch {}
};

export class Session {
  constructor(name) {
    this.name = name;
    this.me = null;
    this.state = null; // { gid, epoch, leader, nextRank, players: {}, log: [] }
    this.clock = new Clock();
    this.links = new Map(); // pid -> Link (MJ et autres joueurs)
    this.status = 'idle'; // idle | answering | waiting | playing | failed | refused
    this.invite = null;
    this.dialing = new Map(); // pid -> offre en cours vers ce joueur
    this.moveSeq = 0;
    this.pendingMoves = [];
    this.lastMoveAt = 0;
    this.mySeq = 0;
    this.onchange = null;
    this.ontoast = null;
    this.timers = [];
  }

  // ----- création / arrivée ------------------------------------------------

  /** Crée une nouvelle partie : ce téléphone en est le premier MJ. */
  static async create(name) {
    const s = new Session(name);
    const secret = rid(16);
    s.me = rid(6);
    s.state = { gid: rid(6), epoch: 1, leader: s.me, nextRank: 0, players: {}, log: [] };
    s.clock.lead();
    s.addPlayer(s.me, name, await sha256(secret));
    s.addLog(`${name} ouvre la partie.`);
    saveIdentity({ gid: s.state.gid, pid: s.me, secret });
    s.status = 'playing';
    s.start();
    return s;
  }

  /** Joueur : lit l'invitation et renvoie la réponse à montrer au MJ. */
  async answer(offer) {
    this.pendingAnswer?.cancel();
    const ans = await answerInvite(offer);
    this.pendingAnswer = ans;
    this.status = 'answering';
    ans.link.then(
      (link) => this.onFirstLink(link),
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

  async onFirstLink(link) {
    this.pendingAnswer = null;
    this.status = 'waiting';
    this.attach(link, null);
    this.firstLink = link;
    const id = loadIdentity();
    this.newSecret = rid(16);
    const hello = {
      type: 'hello',
      name: this.name,
      gid: id?.gid,
      pid: id?.pid,
      secret: id?.secret,
      secretHash: await sha256(this.newSecret),
    };
    // Le tout premier message d'un canal qui vient de s'ouvrir se perd
    // parfois : on le renvoie chaque seconde jusqu'à l'accusé de réception.
    const send = () => {
      if (this.firstLink !== link || this.helloAcked || link.closed) return clearInterval(this.helloTimer);
      link.send(hello);
    };
    clearInterval(this.helloTimer);
    this.helloAcked = false;
    send();
    this.helloTimer = setInterval(send, 1000);
    this.changed();
  }

  start() {
    if (this.timers.length) return;
    this.timers.push(
      setInterval(() => this.heartbeat(), HEARTBEAT_MS),
      setInterval(() => this.tick(), 250),
      setInterval(() => this.isLeader && this.broadcast(), 3000),
    );
    this.pingBurst();
  }

  // ----- rôles ---------------------------------------------------------------

  get isLeader() {
    return !!this.state && this.state.leader === this.me;
  }

  /** Compatibilité avec l'interface : « mj » ou « player ». */
  get role() {
    return this.isLeader ? 'mj' : 'player';
  }

  now() {
    return this.clock.now();
  }

  rank(pid, st = this.state) {
    return st?.players[pid]?.rank ?? Infinity;
  }

  leaderLink() {
    return this.state ? this.links.get(this.state.leader) : null;
  }

  /** Joueurs encore joignables depuis ce téléphone. */
  online(pid) {
    return pid === this.me || this.links.has(pid);
  }

  // ----- connexions ------------------------------------------------------------

  attach(link, pid) {
    link.pid = pid;
    link.lastSeen = performance.now();
    link.onmessage = (msg) => {
      link.lastSeen = performance.now();
      this.onMessage(link, msg);
    };
    link.onclose = () => this.onLinkClosed(link);
    if (pid) {
      const old = this.links.get(pid);
      this.links.set(pid, link);
      if (old && old !== link) old.close();
    }
  }

  heartbeat() {
    const now = performance.now();
    for (const link of [...this.links.values()]) {
      if (now - link.lastSeen > SILENCE_MS) link.close();
      else link.send({ type: 'hb' });
    }
    if (this.firstLink && !this.firstLink.closed && now - this.firstLink.lastSeen > SILENCE_MS * 3) this.firstLink.close();
  }

  onLinkClosed(link) {
    if (link === this.firstLink && !link.pid) {
      // Coupé avant d'être accepté.
      this.status = 'failed';
      this.failure = 'La connexion avec le maître du jeu a été perdue.';
      return this.changed();
    }
    if (!link.pid || this.links.get(link.pid) !== link) return this.changed();
    this.links.delete(link.pid);
    const p = this.state?.players[link.pid];
    if (this.isLeader) {
      if (p && p.online) {
        p.online = false;
        this.addLog(`${p.name} a quitté la partie.`);
        this.broadcast();
      }
      return;
    }
    if (this.state && link.pid === this.state.leader) this.leaderLost();
    this.changed();
  }

  // ----- relève du MJ ----------------------------------------------------------

  leaderLost() {
    clearTimeout(this.electionTimer);
    const st = this.state;
    const old = st.leader;
    const candidates = Object.values(st.players)
      .filter((p) => p.id !== old && this.online(p.id))
      .sort((a, b) => a.rank - b.rank);
    const next = candidates[0];
    if (!next) return;
    if (next.id === this.me) return this.becomeLeader(old);
    // On attend que le suivant se déclare ; s'il ne le fait pas, on le
    // considère parti à son tour et on recommence.
    this.waitingFor = next.id;
    this.electionTimer = setTimeout(() => {
      if (this.state.leader === old) {
        const l = this.links.get(next.id);
        if (l) l.close();
        else this.leaderLost();
      }
    }, 4000);
    this.ontoast?.(`Le maître du jeu est parti. ${next.name} prend la relève…`);
  }

  becomeLeader(old) {
    const st = this.state;
    st.epoch += 1;
    st.leader = this.me;
    for (const p of Object.values(st.players)) p.online = this.online(p.id);
    this.clock.lead();
    this.pendingMoves = [];
    this.mySeq = st.players[this.me].moveSeq || 0;
    if (old && st.players[old]) this.addLog(`${st.players[old].name} a quitté la partie.`);
    this.addLog(`${this.name} devient maître du jeu.`);
    this.ontoast?.('Tu es maintenant maître du jeu.');
    this.broadcast();
  }

  stepDown() {
    this.cancelInvite();
    this.clock.follow();
    this.pingBurst();
  }

  /**
   * Un autre téléphone annonce son état : on le suit s'il est plus légitime.
   * Seul un MJ peut s'annoncer lui-même (pas de rumeur relayée) : on suit
   * toujours un MJ avec qui on est directement connecté.
   */
  acceptState(from, st) {
    if (!st || !st.players || st.gid !== this.state?.gid || st.leader !== from.pid) return;
    const mine = this.state;
    const better =
      st.epoch > mine.epoch ||
      (st.epoch === mine.epoch && (st.leader === mine.leader || this.rank(st.leader, st) < this.rank(mine.leader, mine)));
    if (!better) {
      if (st.leader === mine.leader) return;
      // Un MJ moins légitime s'annonce. Si c'est moi le MJ, je lui envoie mon
      // état (il se rangera derrière moi) ; sinon je lui dis qui je suis.
      if (this.isLeader) from.send({ type: 'state', state: this.snapshot() });
      else from.send({ type: 'not-following', epoch: mine.epoch, leader: mine.leader });
      return;
    }
    const wasLeader = this.isLeader;
    const leaderChanged = st.leader !== mine.leader;
    this.state = st;
    clearTimeout(this.electionTimer);
    if (wasLeader && st.leader !== this.me) this.stepDown();
    else if (leaderChanged) {
      this.clock.follow();
      this.pingBurst();
    }
    this.ackMoves(st.players[this.me]?.moveSeq);
    this.changed();
  }

  // ----- messages --------------------------------------------------------------

  async onMessage(link, msg) {
    const fromLeader = this.state && link.pid === this.state.leader;
    switch (msg.type) {
      case 'hb':
      case 'peer-hello':
        return;
      case 'ping':
        return link.send({ type: 'pong', t0: msg.t0, ts: this.now() });
      case 'pong':
        if (fromLeader) this.clock.onPong(msg);
        return;

      // --- reçus par le MJ ---
      case 'hello':
        return this.onHello(link, msg);
      case 'status':
        if (this.isLeader && link.pid && this.state.players[link.pid]) {
          this.state.players[link.pid].rtt = Number.isFinite(msg.rtt) ? Math.round(msg.rtt) : null;
          this.state.players[link.pid].route = typeof msg.route === 'string' ? msg.route.slice(0, 8) : null;
        }
        return;
      case 'build':
        if (!this.isLeader || !link.pid) return;
        {
          const err = this.applyBuild(link.pid, msg.key);
          if (err) link.send({ type: 'error', message: err });
        }
        return;
      case 'move':
        if (this.isLeader && link.pid) this.applyMove(link.pid, msg.dir, msg.seq);
        return;
      case 'signal':
        return this.onSignal(link, msg);

      // --- reçus par les joueurs ---
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
      case 'state':
        if (link.pid) this.acceptState(link, msg.state);
        return;
      case 'pos':
        if (fromLeader) this.onPos(msg);
        return;
      case 'error':
        if (fromLeader) this.ontoast?.(msg.message);
        return;
      case 'not-following':
        // Ce joueur suit un MJ plus légitime que moi, que je ne peux pas
        // joindre : la partie s'est scindée. Je le laisse partir.
        if (this.isLeader && link.pid && (msg.epoch > this.state.epoch ||
            (msg.epoch === this.state.epoch && this.rank(msg.leader) < this.rank(this.me)))) link.close();
        return;
      case 'mesh-dial':
        if (fromLeader) this.dial(msg.peer);
        return;
    }
  }

  async onHello(link, msg) {
    if (link.pid) return;
    if (link.helloSeen) return link.send({ type: 'hello-ack' }); // demande renvoyée : déjà prise en compte
    link.helloSeen = true;
    if (!this.isLeader) {
      link.send({ type: 'refused', reason: "Ce téléphone n'est plus le maître du jeu. Demande une invitation au nouveau." });
      return setTimeout(() => link.close(), 300);
    }
    const name = String(msg.name || '').trim().slice(0, 16) || 'Joueur';
    const st = this.state;
    const known = msg.gid === st.gid && st.players[msg.pid];
    if (known && typeof msg.secret === 'string' && (await sha256(msg.secret)) === known.secretHash) {
      // Retour d'un joueur : son secret prouve que c'est bien lui, pas besoin de validation.
      return this.admit(link, msg.pid, true);
    }
    if (typeof msg.secretHash !== 'string' || msg.secretHash.length !== 64) return;
    link.send({ type: 'hello-ack' });
    // Pas de validation : le MJ a lui-même scanné (ou collé) la réponse de ce
    // joueur, et une invitation ne sert qu'une fois. C'est déjà son accord.
    if (Object.keys(st.players).length >= MAX_PLAYERS) {
      link.send({ type: 'refused', reason: 'La partie est complète (8 joueurs).' });
      return setTimeout(() => link.close(), 300);
    }
    const pid = rid(6);
    this.addPlayer(pid, name, msg.secretHash);
    this.admit(link, pid, false);
    this.ontoast?.(`${name} a rejoint la partie.`);
  }

  admit(link, pid, back) {
    const p = this.state.players[pid];
    p.online = true;
    this.attach(link, pid);
    this.addLog(back ? `${p.name} est de retour.` : `${p.name} rejoint la partie.`);
    link.send({ type: 'welcome', you: pid, state: this.snapshot() });
    this.broadcast();
    // Présentations : chaque joueur déjà là appelle le nouveau.
    for (const other of this.links.keys()) {
      if (other !== pid) this.links.get(other).send({ type: 'mesh-dial', peer: pid });
    }
  }

  onWelcome(link, msg) {
    if (link !== this.firstLink || !msg.state) return;
    // Rejoindre une partie, c'est adopter l'état de celui qui nous accueille.
    const wasLeader = this.isLeader;
    this.me = msg.you;
    this.state = msg.state;
    if (wasLeader) this.stepDown();
    const id = loadIdentity();
    const secret = id?.gid === msg.state.gid && id?.pid === msg.you ? id.secret : this.newSecret;
    saveIdentity({ gid: msg.state.gid, pid: msg.you, secret });
    this.attach(link, msg.state.leader);
    this.firstLink = null;
    this.moveSeq = msg.state.players[msg.you]?.moveSeq || 0;
    this.pendingMoves = [];
    this.status = 'playing';
    this.clock.follow();
    this.start();
    this.pingBurst();
    this.changed();
  }

  // ----- maillage : le MJ relaie les offres entre joueurs -------------------

  async dial(peer) {
    if (this.links.has(peer) || this.dialing.has(peer) || peer === this.me) return;
    try {
      const offer = await makeOffer();
      this.dialing.set(peer, offer);
      this.leaderLink()?.send({ type: 'signal', to: peer, kind: 'offer', sdp: offer.sdp });
      setTimeout(() => {
        if (this.dialing.get(peer) === offer) {
          offer.cancel();
          this.dialing.delete(peer);
        }
      }, 30000);
    } catch {}
  }

  async onSignal(link, msg) {
    if (typeof msg.sdp !== 'string' || msg.sdp.length > 8000) return;
    // Le MJ relaie vers le destinataire.
    if (msg.to && msg.to !== this.me) {
      if (this.isLeader && link.pid) this.links.get(msg.to)?.send({ type: 'signal', from: link.pid, kind: msg.kind, sdp: msg.sdp });
      return;
    }
    const from = msg.from;
    if (!from || !this.state?.players[from]) return;
    try {
      if (msg.kind === 'offer') {
        if (this.links.has(from)) return;
        const ans = await makeAnswer(msg.sdp);
        this.leaderLink()?.send({ type: 'signal', to: from, kind: 'answer', sdp: ans.sdp });
        const peerLink = await ans.link;
        this.attach(peerLink, from);
        peerLink.send({ type: 'peer-hello', pid: this.me });
        this.changed();
      } else if (msg.kind === 'answer') {
        const offer = this.dialing.get(from);
        if (!offer) return;
        this.dialing.delete(from);
        const peerLink = await offer.connect(msg.sdp);
        this.attach(peerLink, from);
        peerLink.send({ type: 'peer-hello', pid: this.me });
        this.changed();
      }
    } catch {}
  }

  // ----- invitations (MJ) --------------------------------------------------

  async openInvite() {
    this.invite?.cancel();
    this.invite = await createInvite();
    return this.invite.code;
  }

  async acceptAnswer(answer) {
    if (!this.invite) throw Object.assign(new Error('Cette invitation a déjà servi.'), { used: true });
    const invite = this.invite;
    const link = await invite.accept(answer);
    if (this.invite === invite) this.invite = null;
    this.attach(link, null);
    return link;
  }

  cancelInvite() {
    this.invite?.cancel();
    this.invite = null;
  }

  // ----- jeu ---------------------------------------------------------------------

  addPlayer(pid, name, secretHash) {
    const st = this.state;
    const rank = st.nextRank++;
    const home = freeCell(Object.values(st.players).map((p) => p.home));
    st.players[pid] = {
      id: pid,
      name,
      rank,
      color: COLORS[rank % COLORS.length],
      secretHash,
      planet: newPlanet(this.now()),
      home,
      pos: { ...home },
      moveSeq: 0,
      online: true,
      rtt: null,
      route: null,
    };
  }

  build(key) {
    if (this.isLeader) {
      const err = this.applyBuild(this.me, key);
      if (err) this.ontoast?.(err);
      return;
    }
    if (this.status !== 'playing') return;
    const l = this.leaderLink();
    if (!l) return this.ontoast?.('Changement de maître du jeu en cours, réessaie dans un instant.');
    l.send({ type: 'build', key });
  }

  applyBuild(pid, key) {
    const p = this.state.players[pid];
    if (!p) return 'Joueur inconnu.';
    const err = startBuild(p.planet, key, this.now());
    if (err) return err;
    this.addLog(`${p.name} lance ${BUILDINGS[key].name} niv. ${p.planet.queue.level}.`);
    this.broadcast();
    return null;
  }

  move(dir) {
    if (!DIRS[dir]) return;
    if (this.isLeader) return this.applyMove(this.me, dir, ++this.mySeq);
    if (this.status !== 'playing') return;
    const l = this.leaderLink();
    if (!l) return;
    const t = performance.now();
    if (t - this.lastMoveAt < MOVE_COOLDOWN) return;
    this.lastMoveAt = t;
    const seq = ++this.moveSeq;
    this.pendingMoves.push({ seq, dir });
    l.send({ type: 'move', dir, seq });
  }

  applyMove(pid, dir, seq) {
    const p = this.state.players[pid];
    if (!p || !DIRS[dir] || !Number.isFinite(seq)) return;
    const now = this.now();
    if (now - (p.lastMove || 0) >= MOVE_COOLDOWN - 40) {
      p.pos = step(p.pos, dir);
      p.lastMove = now;
    }
    p.moveSeq = Math.max(p.moveSeq || 0, seq);
    if (pid === this.me) this.mySeq = p.moveSeq;
    const msg = { type: 'pos', id: pid, x: p.pos.x, y: p.pos.y, seq: p.moveSeq };
    for (const link of this.links.values()) link.send(msg);
  }

  onPos(msg) {
    const p = this.state.players[msg.id];
    if (!p) return;
    p.pos = { x: msg.x, y: msg.y };
    p.moveSeq = msg.seq;
    if (msg.id === this.me) this.ackMoves(msg.seq);
  }

  ackMoves(seq) {
    if (Number.isFinite(seq)) this.pendingMoves = this.pendingMoves.filter((m) => m.seq > seq);
  }

  /** Ma position, avec les pas pas encore confirmés par le MJ. */
  myPos() {
    const me = this.state?.players[this.me];
    if (!me?.pos) return null;
    if (this.isLeader) return me.pos;
    return this.pendingMoves.reduce((pos, m) => step(pos, m.dir), me.pos);
  }

  tick() {
    if (!this.isLeader) return;
    const now = this.now();
    let changed = false;
    for (const p of Object.values(this.state.players)) {
      if (p.planet.queue && p.planet.queue.end <= now) {
        const done = settle(p.planet, now);
        if (done) {
          this.addLog(`${p.name} termine ${BUILDINGS[done.key].name} niv. ${done.level}.`);
          changed = true;
        }
      }
    }
    if (changed) this.broadcast();
  }

  pingBurst() {
    clearInterval(this.pinger);
    let n = 0;
    const tick = async () => {
      if (this.isLeader) return;
      const l = this.leaderLink();
      if (!l) return;
      l.send(this.clock.ping());
      this.route = (await l.route()) || this.route;
      l.send({ type: 'status', rtt: this.clock.rtt, route: this.route });
      if (++n === 6) {
        clearInterval(this.pinger);
        this.pinger = setInterval(tick, 2000);
      }
    };
    this.pinger = setInterval(tick, 150);
  }

  addLog(text) {
    this.state.log.push({ at: this.now(), text });
    if (this.state.log.length > 40) this.state.log.shift();
  }

  snapshot() {
    return JSON.parse(JSON.stringify({ ...this.state, log: this.state.log.slice(-20) }));
  }

  broadcast() {
    if (!this.isLeader) return;
    const msg = { type: 'state', state: this.snapshot() };
    for (const link of this.links.values()) link.send(msg);
    this.changed();
  }

  changed() {
    this.onchange?.('state');
  }

  /** Nombre de joueurs connectés à ce téléphone (hors lui-même). */
  get peerCount() {
    return this.links.size;
  }

  /** Seul en ligne alors que la partie compte d'autres joueurs. */
  get alone() {
    return !!this.state && this.links.size === 0 && Object.keys(this.state.players).length > 1;
  }

  end() {
    this.timers.forEach(clearInterval);
    this.timers = [];
    clearInterval(this.pinger);
    clearInterval(this.helloTimer);
    clearTimeout(this.electionTimer);
    this.cancelInvite();
    this.pendingAnswer?.cancel();
    for (const o of this.dialing.values()) o.cancel();
    for (const link of [...this.links.values()]) {
      link.onclose = null;
      link.close();
    }
    this.links.clear();
  }
}
