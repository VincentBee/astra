// Une partie vue depuis un téléphone. Tous les téléphones sont au même
// niveau : pas de maître du jeu, chacun garde une copie complète de la partie
// et chacun peut inviter de nouveaux joueurs.
//
// Comment rester d'accord sans arbitre : chaque joueur est le seul à écrire
// sa propre fiche (sa planète, son vaisseau). Il applique ses ordres tout de
// suite chez lui, puis envoie sa fiche à jour aux autres. Une fiche porte
// l'heure de sa dernière modification (`actAt`) : entre deux versions de la
// même fiche, la plus récente l'emporte. Comme personne n'écrit la fiche d'un
// autre, il n'y a jamais de conflit, même si le groupe a été coupé en deux.
//
// Les fiches se propagent de proche en proche : un téléphone qui reçoit une
// fiche plus récente que la sienne la transmet à ses autres voisins.
//
// Reconnexion sans rescanner : tous les téléphones de la partie se donnent
// rendez-vous via des relais publics (js/rendezvous.js). En se retrouvant,
// deux téléphones échangent leurs copies et gardent, pour chaque joueur, la
// fiche la plus récente.

import { createInvite, answerInvite, makeOffer, makeAnswer } from './peer.js';
import { Rendezvous } from './rendezvous.js';
import { saveGame, loadGame, mergeStates } from './save.js';
import { newPlanet, settle, startBuild, BUILDINGS, step, freeCell, DIRS, MOVE_COOLDOWN } from './game.js';

const COLORS = ['#7aa2ff', '#ff9f6b', '#7cf0b4', '#f7d06b', '#d38bff', '#6fd3ff', '#ff7a93', '#b7e36b'];
const MAX_PLAYERS = 8;
const HEARTBEAT_MS = 1500;
// Sans nouvelles depuis ce délai, la connexion est considérée perdue (un
// écran verrouillé quelques secondes ne doit pas faire sortir de la partie).
const SILENCE_MS = 30000;
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

/** Copie sans les champs des anciennes versions (maître du jeu, époques). */
function clean(state) {
  const st = JSON.parse(JSON.stringify(state));
  delete st.leader;
  delete st.epoch;
  delete st.nextRank;
  st.log ||= [];
  return st;
}

export class Session {
  constructor(name) {
    this.name = name;
    this.me = null;
    this.state = null; // { gid, key, players: {}, log: [] }
    this.links = new Map(); // pid -> Link
    this.status = 'idle'; // idle | answering | waiting | playing | failed | refused
    this.invite = null;
    this.dialing = new Map(); // pid -> offre en cours vers ce joueur
    this.lastMoveAt = 0;
    this.onchange = null;
    this.ontoast = null;
    this.timers = [];
  }

  // ----- création / arrivée ------------------------------------------------

  /** Crée une nouvelle partie. */
  static async create(name) {
    const s = new Session(name);
    const secret = rid(16);
    s.me = rid(6);
    // key : clé de la partie, qui protège le rendez-vous automatique.
    s.state = { gid: rid(6), key: rid(16), players: {}, log: [] };
    s.addPlayer(s.me, name, await sha256(secret));
    s.addLog(`${name} ouvre la partie.`);
    saveIdentity({ gid: s.state.gid, pid: s.me, secret });
    s.status = 'playing';
    s.start();
    s.save();
    return s;
  }

  /**
   * Reprend la partie sauvegardée sur ce téléphone, même des jours après :
   * le temps écoulé est rattrapé (production, chantiers terminés) et les
   * autres joueurs se reconnectent tout seuls dès qu'ils sont en ligne.
   */
  static resume(saved) {
    const s = new Session(saved.state.players[saved.me]?.name || 'Commandant');
    s.me = saved.me;
    s.state = clean(saved.state);
    s.status = 'playing';
    s.refreshOnline();
    s.start();
    s.tick();
    s.save();
    return s;
  }

  /** Invité : lit l'invitation et renvoie la réponse à montrer à l'hôte. */
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
      // Ma copie de la partie, si j'en ai une : ma progression faite hors
      // ligne est gardée.
      copy: loadGame()?.state,
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
    this.meet();
    if (this.timers.length) return;
    this.timers.push(
      setInterval(() => this.heartbeat(), HEARTBEAT_MS),
      setInterval(() => this.tick(), 250),
    );
    this.onVisible = () => {
      if (document.visibilityState === 'hidden') return this.save();
      if (document.visibilityState !== 'visible' || !this.state) return;
      // Au réveil, les connexions ont pu tomber : on se réannonce tout de suite.
      if (this.alone) this.rdv?.refresh();
      this.changed();
    };
    document.addEventListener('visibilitychange', this.onVisible);
  }

  // ----- état ------------------------------------------------------------------

  /** Heure de la partie : celle du téléphone (réglée automatiquement par le réseau). */
  now() {
    return Date.now();
  }

  /** Joueurs joignables depuis ce téléphone. */
  online(pid) {
    return pid === this.me || this.links.has(pid);
  }

  refreshOnline() {
    for (const p of Object.values(this.state?.players || {})) p.online = this.online(p.id);
  }

  /** Latence et type de chemin réseau vers ce joueur. */
  linkInfo(pid) {
    const l = this.links.get(pid);
    return l ? { rtt: l.rtt ?? null, route: l.routeType ?? null } : null;
  }

  // ----- connexions ------------------------------------------------------------

  attach(link, pid) {
    const prev = pid && this.links.get(pid);
    if (prev && !prev.closed && prev.viaRoom && !link.viaRoom) {
      // Déjà reliés par le rendez-vous : cette connexion-ci est en trop.
      link.onclose = null;
      return link.close();
    }
    link.pid = pid;
    link.lastSeen = performance.now();
    link.onmessage = (msg) => {
      link.lastSeen = performance.now();
      this.onMessage(link, msg);
    };
    link.onclose = () => this.onLinkClosed(link);
    if (pid) {
      this.links.set(pid, link);
      if (prev && prev !== link) prev.close();
      this.refreshOnline();
    }
  }

  heartbeat() {
    const now = performance.now();
    for (const link of [...this.links.values()]) {
      if (now - link.lastSeen > SILENCE_MS) link.close();
      else {
        link.send({ type: 'hb', t0: now });
        link.route?.().then((r) => r && (link.routeType = r));
      }
    }
    if (this.firstLink && !this.firstLink.closed && now - this.firstLink.lastSeen > SILENCE_MS) this.firstLink.close();
  }

  onLinkClosed(link) {
    if (link === this.firstLink && !link.pid) {
      // Coupé avant d'être accepté.
      this.status = 'failed';
      this.failure = 'La connexion avec ton hôte a été perdue.';
      return this.changed();
    }
    if (link.pid && this.links.get(link.pid) === link) {
      this.links.delete(link.pid);
      this.refreshOnline();
    }
    this.changed();
  }

  // ----- messages --------------------------------------------------------------

  async onMessage(link, msg) {
    switch (msg.type) {
      case 'hb':
        return link.send({ type: 'hb-ack', t0: msg.t0 });
      case 'hb-ack':
        if (Number.isFinite(msg.t0)) link.rtt = Math.round(performance.now() - msg.t0);
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

  async onHello(link, msg) {
    if (link.pid) return;
    if (link.helloSeen) return link.send({ type: 'hello-ack' }); // demande renvoyée : déjà prise en compte
    link.helloSeen = true;
    if (this.status !== 'playing') return;
    const name = String(msg.name || '').trim().slice(0, 16) || 'Joueur';
    // Il apporte sa copie de la partie : on garde ce qu'elle a de plus récent.
    this.mergeIn(msg.copy, link);
    const st = this.state;
    const known = msg.gid === st.gid && st.players[msg.pid];
    if (known && typeof msg.secret === 'string' && (await sha256(msg.secret)) === known.secretHash) {
      // Retour d'un joueur : son secret prouve que c'est bien lui.
      return this.admit(link, msg.pid, null);
    }
    if (typeof msg.secretHash !== 'string' || msg.secretHash.length !== 64) return;
    link.send({ type: 'hello-ack' });
    // Pas de validation : l'hôte a lui-même scanné (ou collé) la réponse, et
    // une invitation ne sert qu'une fois. C'est déjà son accord.
    if (Object.keys(st.players).length >= MAX_PLAYERS) {
      link.send({ type: 'refused', reason: 'La partie est complète (8 joueurs).' });
      return setTimeout(() => link.close(), 300);
    }
    const pid = rid(6);
    this.addPlayer(pid, name, msg.secretHash);
    this.admit(link, pid, this.addLog(`${name} rejoint la partie, invité par ${this.name}.`));
    this.ontoast?.(`${name} a rejoint la partie.`);
  }

  /** Fait entrer un joueur (nouveau ou de retour) et le présente aux autres. */
  admit(link, pid, log) {
    this.attach(link, pid);
    link.send({ type: 'welcome', you: pid, from: this.me, state: this.snapshot() });
    // Les autres apprennent son arrivée de proche en proche…
    this.spread(this.state.players[pid], log, link);
    // …et l'appellent directement, en passant par moi pour se présenter.
    for (const [other, l] of this.links) if (other !== pid) l.send({ type: 'mesh-dial', peer: pid });
    this.changed();
  }

  onWelcome(link, msg) {
    if (link !== this.firstLink || !msg.state || typeof msg.from !== 'string') return;
    // On adopte la copie de l'hôte, complétée par la nôtre s'il s'agit de la
    // même partie (progression faite hors ligne).
    const mine = loadGame();
    let st = clean(msg.state);
    if (mine && mine.state.gid === st.gid) st = mergeStates(st, clean(mine.state));
    this.me = msg.you;
    this.state = st;
    const id = loadIdentity();
    const secret = id?.gid === st.gid && id?.pid === msg.you ? id.secret : this.newSecret;
    saveIdentity({ gid: st.gid, pid: msg.you, secret });
    this.firstLink = null;
    this.status = 'playing';
    this.attach(link, msg.from);
    link.send({ type: 'sync', state: this.snapshot() });
    this.start();
    this.changed();
  }

  /**
   * Copie complète reçue d'un autre : pour chaque joueur, on garde la fiche
   * la plus récente, et on transmet ce qu'on vient d'apprendre à nos voisins.
   */
  mergeIn(st, from) {
    if (!st?.players || st.gid !== this.state?.gid) return;
    const before = this.state;
    const merged = mergeStates(before, clean(st));
    delete merged.epoch;
    delete merged.nextRank;
    this.state = merged;
    this.refreshOnline();
    for (const [pid, p] of Object.entries(merged.players)) {
      if ((p.actAt || 0) > (before.players[pid]?.actAt || 0)) this.spread(p, null, from);
    }
    this.changed();
  }

  /** Fiche d'un joueur, reçue de proche en proche. */
  onRecord(link, rec, log) {
    if (!rec || typeof rec.id !== 'string' || !rec.planet || !this.state) return;
    const ours = this.state.players[rec.id];
    if (ours && (rec.actAt || 0) <= (ours.actAt || 0)) return; // déjà vue
    if (!ours && Object.keys(this.state.players).length >= MAX_PLAYERS * 2) return;
    this.state.players[rec.id] = { ...JSON.parse(JSON.stringify(rec)), online: this.online(rec.id) };
    if (log && typeof log.text === 'string' && Number.isFinite(log.at)) this.pushLog(log);
    this.spread(rec, log, link);
    this.scheduleSave();
    this.onchange?.(log ? 'state' : 'pos');
  }

  /** Envoie une fiche à tous mes voisins (sauf celui d'où elle vient). */
  spread(rec, log, except) {
    if (!rec) return;
    const { online, ...data } = rec;
    const msg = { type: 'rec', rec: data, ...(log ? { log } : {}) };
    for (const l of this.links.values()) if (l !== except) l.send(msg);
  }

  /** J'ai modifié ma fiche : je la date et je la diffuse. */
  touch(log) {
    const p = this.state.players[this.me];
    p.actAt = Math.max(this.now(), (p.actAt || 0) + 1);
    this.spread(p, log);
  }

  // ----- rendez-vous automatique (reconnexion sans rescanner) ---------------

  /** Clé de la partie (les parties d'avant le rendez-vous n'en ont pas). */
  get gameKey() {
    return this.state.key || `k-${this.state.gid}`;
  }

  /** Rejoint le salon de la partie, ou en change si on a changé de partie. */
  meet() {
    if (!this.state || !this.me || this.status !== 'playing') return;
    const r = this.rdv;
    if (r && r.gid === this.state.gid && r.me === this.me && r.key === this.gameKey) return;
    r?.leave();
    this.rdv = new Rendezvous({
      gid: this.state.gid,
      key: this.gameKey,
      me: this.me,
      onLink: (link, pid) => this.onRoomLink(link, pid),
    });
    this.rdv.join();
  }

  /** Un joueur de la partie retrouvé au rendez-vous : on échange nos copies. */
  onRoomLink(link, pid) {
    if (this.status !== 'playing' || !this.state) return link.close();
    this.attach(link, pid);
    link.send({ type: 'sync', state: this.snapshot() });
    this.changed();
  }

  // ----- maillage : chacun peut présenter deux joueurs ----------------------

  async dial(peer, via) {
    if (typeof peer !== 'string' || this.links.has(peer) || this.dialing.has(peer) || peer === this.me) return;
    try {
      const offer = await makeOffer();
      this.dialing.set(peer, offer);
      via.send({ type: 'signal', to: peer, kind: 'offer', sdp: offer.sdp });
      setTimeout(() => {
        if (this.dialing.get(peer) === offer) {
          offer.cancel();
          this.dialing.delete(peer);
        }
      }, 30000);
    } catch {}
  }

  async onSignal(link, msg) {
    if (typeof msg.sdp !== 'string' || msg.sdp.length > 8000 || !link.pid) return;
    // Pas pour moi : je relaie au destinataire si je le connais.
    if (msg.to && msg.to !== this.me) {
      this.links.get(msg.to)?.send({ type: 'signal', from: link.pid, kind: msg.kind, sdp: msg.sdp });
      return;
    }
    const from = msg.from;
    if (!from || from === this.me) return;
    try {
      if (msg.kind === 'offer') {
        if (this.links.has(from)) return;
        const ans = await makeAnswer(msg.sdp);
        link.send({ type: 'signal', to: from, kind: 'answer', sdp: ans.sdp });
        const peerLink = await ans.link;
        this.attach(peerLink, from);
        this.changed();
      } else if (msg.kind === 'answer') {
        const offer = this.dialing.get(from);
        if (!offer) return;
        this.dialing.delete(from);
        const peerLink = await offer.connect(msg.sdp);
        this.attach(peerLink, from);
        peerLink.send({ type: 'sync', state: this.snapshot() });
        this.changed();
      }
    } catch {}
  }

  // ----- invitations (tout le monde peut inviter) ---------------------------

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
    const others = Object.values(st.players);
    const home = freeCell(others.map((p) => p.home));
    const used = new Set(others.map((p) => p.color));
    const now = this.now();
    st.players[pid] = {
      id: pid,
      name,
      rank: now, // ordre d'arrivée
      color: COLORS.find((c) => !used.has(c)) || COLORS[others.length % COLORS.length],
      secretHash,
      planet: newPlanet(now),
      home,
      pos: { ...home },
      online: true,
      actAt: now, // dernière modification de la fiche (sert à garder la plus récente)
    };
  }

  build(key) {
    if (this.status !== 'playing') return;
    const p = this.state.players[this.me];
    const err = startBuild(p.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    this.touch(this.addLog(`${p.name} lance ${BUILDINGS[key].name} niv. ${p.planet.queue.level}.`));
    this.changed();
  }

  move(dir) {
    if (!DIRS[dir] || this.status !== 'playing') return;
    const t = performance.now();
    if (t - this.lastMoveAt < MOVE_COOLDOWN) return;
    this.lastMoveAt = t;
    const p = this.state.players[this.me];
    p.pos = step(p.pos, dir);
    this.touch();
    this.scheduleSave();
    this.onchange?.('pos');
  }

  myPos() {
    return this.state?.players[this.me]?.pos || null;
  }

  /** Je termine moi-même mes chantiers (l'affichage des autres se calcule seul). */
  tick() {
    if (this.status !== 'playing' || !this.state) return;
    const p = this.state.players[this.me];
    if (!p?.planet.queue || p.planet.queue.end > this.now()) return;
    const done = settle(p.planet, this.now());
    if (!done) return;
    this.touch(this.addLog(`${p.name} termine ${BUILDINGS[done.key].name} niv. ${done.level}.`));
    this.changed();
  }

  addLog(text) {
    const entry = { at: this.now(), text };
    this.pushLog(entry);
    return entry;
  }

  pushLog(entry) {
    const log = this.state.log;
    if (log.some((l) => l.at === entry.at && l.text === entry.text)) return;
    log.push({ at: entry.at, text: String(entry.text).slice(0, 120) });
    log.sort((a, b) => a.at - b.at);
    if (log.length > 40) log.splice(0, log.length - 40);
  }

  snapshot() {
    const st = JSON.parse(JSON.stringify({ ...this.state, log: this.state.log.slice(-20) }));
    for (const p of Object.values(st.players)) delete p.online;
    return st;
  }

  changed() {
    this.save(); // tout de suite : l'appli peut être fermée juste après une action
    this.onchange?.('state');
  }

  /** Sauvegarde (au plus deux fois par seconde) de ma copie de la partie. */
  scheduleSave() {
    if (!this.state || !this.me || this.status !== 'playing' || this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, 500);
  }

  save() {
    if (this.state && this.me && this.status === 'playing') saveGame(this.me, this.state);
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
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.save();
    if (this.onVisible) document.removeEventListener('visibilitychange', this.onVisible);
    this.timers.forEach(clearInterval);
    this.timers = [];
    clearInterval(this.helloTimer);
    this.cancelInvite();
    this.pendingAnswer?.cancel();
    for (const o of this.dialing.values()) o.cancel();
    for (const link of [...this.links.values()]) {
      link.onclose = null;
      link.close();
    }
    this.links.clear();
    this.rdv?.leave();
    this.rdv = null;
  }
}
