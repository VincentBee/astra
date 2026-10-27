// Une partie vue depuis un téléphone. Tous les téléphones sont au même
// niveau : pas de maître du jeu, chacun garde une copie complète de la partie
// et chacun peut inviter de nouveaux joueurs.
//
// Comment rester d'accord sans arbitre : chaque joueur est le seul à écrire
// sa propre fiche (sa planète). Il applique ses ordres tout de
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
import { newPlanet, settle, stateAt, startBuild, startResearch, startShips, usePower, RACES, RES_INFO, POWERS, planetsFor, sameCell, SOIL, UNIVERSE } from './game.js';
import { TECHS, SHIPS } from './tech.js';
import { launch, battle, plunder, moveTo, stopAt, moving, countShips, fuelAt, fuelNeed, refuel, setShips, ORDERS, MAX_FLEETS } from './fleet.js';

/** « de Beta », « d'Alpha ». */
const de = (name) => (/^[aeiouyhàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`);

/**
 * Version du format des fiches. Chaque téléphone écrit la sienne dans sa
 * fiche : un joueur qui voit une fiche plus récente doit recharger l'appli.
 * 2 : flottes pilotées librement sur la carte.
 * 3 : carburant des flottes.
 */
export const FORMAT = 3;

const shipsText = (n) => `${n} vaisseau${n > 1 ? 'x' : ''}`;

/** « 173 minéraux et 37 nourriture » (vide si rien). */
function lootText(take) {
  const parts = Object.entries(take)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `${v} ${RES_INFO[r].name.toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0] || '';
}

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

/**
 * Fiche d'un joueur au format actuel. Avant les races, les planètes
 * produisaient métal, cristal et deutérium : une fiche sans race n'a pas
 * encore de planète, son joueur choisira sa race en revenant.
 */
function normalize(p) {
  delete p.pos; // vaisseaux d'avant : on ne se déplace plus sur la carte
  if (!RACES[p.race]) {
    p.race = null;
    p.planet = null;
  }
  // Colonies, flottes en route, dégâts infligés aux autres (et reçus, déjà appliqués).
  if (!p.colonies || typeof p.colonies !== 'object') p.colonies = {};
  if (!Array.isArray(p.fleets)) p.fleets = [];
  p.fleets.forEach(upgradeFleet);
  if (!Array.isArray(p.effects)) p.effects = [];
  if (!Array.isArray(p.applied)) p.applied = [];
  return p;
}

/**
 * Flotte d'avant le pilotage libre (un trajet à mission, qui disparaissait à
 * l'arrivée) : sa mission devient l'ordre qui l'attend à l'arrivée.
 */
function upgradeFleet(f) {
  if (!f.mission) return;
  const t = f.target || {};
  f.order =
    f.mission === 'colonize' ? { kind: 'colonize', world: t.world }
    : f.mission === 'attack' ? { kind: 'attack', pid: t.pid, key: t.key }
    : { kind: 'dock', key: t.key || f.origin };
  delete f.mission;
  delete f.target;
}

/** Copie sans les champs des anciennes versions (maître du jeu, époques, ressources d'avant les races). */
function clean(state) {
  const st = JSON.parse(JSON.stringify(state));
  delete st.leader;
  delete st.epoch;
  delete st.nextRank;
  st.log ||= [];
  for (const p of Object.values(st.players || {})) normalize(p);
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
    if (!rec || typeof rec.id !== 'string' || !this.state) return;
    const ours = this.state.players[rec.id];
    if (ours && (rec.actAt || 0) <= (ours.actAt || 0)) return; // déjà vue
    if (!ours && Object.keys(this.state.players).length >= MAX_PLAYERS * 2) return;
    this.state.players[rec.id] = normalize({ ...JSON.parse(JSON.stringify(rec)), online: this.online(rec.id) });
    // Une ou plusieurs entrées de journal accompagnent la fiche.
    for (const l of [].concat(log || []).slice(0, 10)) {
      if (l && typeof l.text === 'string' && Number.isFinite(l.at)) this.pushLog(l);
    }
    this.spread(rec, log, link);
    this.scheduleSave();
    this.onchange?.('state');
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
    p.v = FORMAT;
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
    const used = new Set(others.map((p) => p.color));
    const now = this.now();
    st.players[pid] = {
      id: pid,
      name,
      rank: now, // ordre d'arrivée
      color: COLORS.find((c) => !used.has(c)) || COLORS[others.length % COLORS.length],
      secretHash,
      // À l'arrivée, on choisit sa race (une fois pour toutes), puis sa planète de départ.
      race: null,
      planet: null,
      home: null,
      online: true,
      actAt: now, // dernière modification de la fiche (sert à garder la plus récente)
    };
  }

  /** Ma race, ou null tant que je ne l'ai pas choisie. */
  get myRace() {
    return this.state?.players[this.me]?.race || null;
  }

  /** Choix de race : une seule fois, il ne se défait pas. */
  chooseRace(race) {
    if (this.status !== 'playing' || !RACES[race]) return false;
    const p = this.state.players[this.me];
    if (!p) return false;
    if (p.race) {
      this.ontoast?.(`Tu as déjà choisi : ${RACES[p.race].name}. Ce choix est définitif.`);
      return false;
    }
    p.race = race;
    // Joueur d'avant le choix de planète : il garde la sienne.
    if (p.home) p.planet = newPlanet(race, this.now());
    this.touch(this.addLog(`${p.name} rejoint le camp des ${RACES[race].name}.`));
    this.changed();
    return true;
  }

  // ----- planètes ---------------------------------------------------------------

  /** Planètes de l'univers (les mêmes sur tous les téléphones, tirées de l'identifiant de la partie). */
  get planets() {
    if (this.world?.gid !== this.state?.gid) this.world = { gid: this.state?.gid, list: this.state ? planetsFor(this.state.gid) : [] };
    return this.world.list;
  }

  /**
   * Toutes les planètes d'un joueur : sa planète mère (clé « home ») et ses
   * colonies (clé = identifiant de la planète de l'univers).
   * [{ key, planet, cell, name }]
   */
  planetsOf(p) {
    if (!p) return [];
    const out = [];
    if (p.planet && p.home) {
      const w = this.planets.find((x) => sameCell(x, p.home));
      out.push({ key: 'home', planet: p.planet, cell: p.home, name: w?.name || 'Planète mère' });
    }
    for (const [id, planet] of Object.entries(p.colonies || {})) {
      const w = this.planets.find((x) => x.id === id);
      if (w) out.push({ key: id, planet, cell: { x: w.x, y: w.y }, name: w.name });
    }
    return out;
  }

  planetOf(p, key) {
    return this.planetsOf(p).find((x) => x.key === key) || null;
  }

  /**
   * Propriétaire d'une case : le premier à s'y être installé (planète mère
   * ou colonie). Deux joueurs peuvent s'installer au même endroit au même
   * moment (ou coupés l'un de l'autre) ; c'est le plus ancien qui compte,
   * partout pareil.
   */
  ownerAt(cell) {
    let best = null;
    const consider = (p, t) => {
      const k = [t, p.id];
      if (!best || k[0] < best.k[0] || (k[0] === best.k[0] && k[1] < best.k[1])) best = { p, k };
    };
    const w = this.planets.find((x) => sameCell(x, cell));
    for (const p of Object.values(this.state?.players || {})) {
      if (sameCell(p.home, cell)) consider(p, p.claimAt || p.rank || 0);
      const col = w && p.colonies?.[w.id];
      if (col) consider(p, col.claimAt || 0);
    }
    return best?.p || null;
  }

  /** Ma planète de l'univers (avec ses gisements de départ), ou null. */
  get myWorld() {
    const home = this.state?.players[this.me]?.home;
    return (home && this.planets.find((w) => sameCell(w, home))) || null;
  }

  /** M'installer sur une planète libre : une fois la race choisie, au début de la partie. */
  claimPlanet(id) {
    if (this.status !== 'playing') return false;
    const p = this.state.players[this.me];
    const w = this.planets.find((x) => x.id === id);
    if (!p?.race || !w) return false;
    if (p.home) {
      this.ontoast?.('Tu as déjà une planète.');
      return false;
    }
    const owner = this.ownerAt(w);
    if (owner) {
      this.ontoast?.(`${w.name} appartient déjà à ${owner.name}.`);
      return false;
    }
    const now = this.now();
    p.home = { x: w.x, y: w.y };
    p.claimAt = now;
    p.planet ||= newPlanet(p.race, now, w);
    this.touch(this.addLog(`${p.name} s'installe sur ${w.name}.`));
    this.changed();
    return true;
  }

  /**
   * Quelqu'un s'est installé sur une de mes planètes avant moi (choix
   * simultanés) : je la lui laisse. Je suis le seul à écrire ma fiche, c'est
   * donc à mon téléphone de le faire.
   */
  checkClaim() {
    const p = this.state?.players[this.me];
    if (!p) return;
    for (const id of Object.keys(p.colonies || {})) {
      const w = this.planets.find((x) => x.id === id);
      const owner = w && this.ownerAt(w);
      if (!owner || owner.id === this.me) continue;
      delete p.colonies[id];
      this.touch(this.addLog(`${owner.name} a fondé sa colonie sur ${w.name} juste avant ${p.name}.`));
      this.changed();
    }
    if (!p.home) return;
    const owner = this.ownerAt(p.home);
    if (!owner || owner.id === this.me) return;
    const w = this.myWorld;
    p.home = null;
    p.planet = null;
    delete p.claimAt;
    this.touch();
    this.ontoast?.(`${owner.name} s'est installé sur ${w?.name || 'cette planète'} juste avant toi : choisis-en une autre.`);
    this.changed();
  }

  /** Une de mes planètes, pour un ordre ; sinon un message. */
  myPlanet(key) {
    const p = this.state.players[this.me];
    const found = this.planetOf(p, key);
    if (!found) this.ontoast?.('Planète introuvable.');
    return found;
  }

  build(key, where = 'home') {
    if (this.status !== 'playing') return;
    const p = this.state.players[this.me];
    if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
    const pl = this.myPlanet(where);
    if (!pl) return;
    const err = startBuild(pl.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    const b = RACES[p.race].buildings[key];
    this.touch(this.addLog(`${p.name} lance ${b.name} niv. ${pl.planet.queue.level} sur ${pl.name}.`));
    this.changed();
  }

  /** Recherche : sur la planète mère, là où est le labo. */
  research(key) {
    if (this.status !== 'playing') return;
    const p = this.state.players[this.me];
    if (!p?.planet) return;
    const err = startResearch(p.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    this.touch(this.addLog(`${p.name} lance la recherche ${TECHS[p.race][key].name} niv. ${p.planet.research.level}.`));
    this.changed();
  }

  /** Lot de vaisseaux au chantier naval d'une de mes planètes. */
  buildShips(type, count, where = 'home') {
    if (this.status !== 'playing') return;
    const p = this.state.players[this.me];
    const pl = this.myPlanet(where);
    if (!pl) return;
    const err = startShips(pl.planet, type, count, this.now());
    if (err) return this.ontoast?.(err);
    this.touch(this.addLog(`${p.name} met en chantier ${count} × ${SHIPS[p.race][type].name} sur ${pl.name}.`));
    this.changed();
  }

  /** Une de mes flottes, par son identifiant. */
  myFleet(id) {
    return (this.state.players[this.me]?.fleets || []).find((f) => f.id === id) || null;
  }

  /** Mes planètes et celles des autres sur une case : [{ owner, key, name }]. */
  planetsAt(cell) {
    const out = [];
    for (const p of Object.values(this.state.players)) {
      for (const pl of this.planetsOf(p)) if (sameCell(pl.cell, cell) && this.ownerAt(pl.cell)?.id === p.id) out.push({ owner: p, key: pl.key, name: pl.name });
    }
    return out;
  }

  /**
   * Ce qu'une de mes flottes peut faire en arrivant sur `cell` :
   * [{ kind, label, short }]. `kind` est ce qu'on passe à moveFleet ;
   * « move » y va simplement et attend en orbite. `short` : le carburant ne
   * suffit pas, la flotte tombera en panne avant d'arriver.
   */
  ordersAt(id, cell) {
    const f = this.myFleet(id);
    if (!f) return [];
    const w = this.planets.find((x) => sameCell(x, cell));
    const here = this.planetsAt(cell)[0];
    const out = [];
    if (here?.owner.id === this.me) out.push({ kind: 'dock', label: `Se poser sur ${here.name}` });
    else if (here) out.push({ kind: 'attack', label: `Attaquer ${here.name} (${here.owner.name})` });
    else if (w && f.ships.colony) out.push({ kind: 'colonize', label: `Coloniser ${w.name}` });
    out.push({ kind: 'move', label: w || here ? 'Juste y aller (orbite)' : 'Y aller' });
    const me = this.state.players[this.me];
    const now = this.now();
    const short = fuelNeed(f, me.race, cell, now) > fuelAt(f, me.race, now) + 1e-9;
    return out.map((o) => ({ ...o, short }));
  }

  /** Faire décoller des vaisseaux (avec cargaison et carburant) d'une de mes planètes. */
  takeOff(fromKey, ships, cargo, fuel) {
    if (this.status !== 'playing') return false;
    const p = this.state.players[this.me];
    const from = this.planetOf(p, fromKey);
    if (!from) {
      this.ontoast?.('Planète introuvable.');
      return false;
    }
    p.fleets ||= [];
    if (p.fleets.length >= MAX_FLEETS) {
      this.ontoast?.(`Pas plus de ${MAX_FLEETS} flottes.`);
      return false;
    }
    const res = launch(from.planet, { ships, cargo, fuel, at: from.cell, origin: fromKey, id: rid(6) }, this.now());
    if (res.error) {
      this.ontoast?.(res.error);
      return false;
    }
    p.fleets.push(res.fleet);
    this.touch(this.addLog(`Une flotte ${de(p.name)} décolle de ${from.name} : ${shipsText(countShips(res.fleet.ships))}.`));
    this.changed();
    return res.fleet.id;
  }

  /**
   * Envoie une de mes flottes sur une case. `kind` vient de ordersAt :
   * move, dock, colonize ou attack.
   */
  moveFleet(id, cell, kind = 'move') {
    if (this.status !== 'playing') return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    if (!f) return false;
    if (cell.x < 0 || cell.y < 0 || cell.x >= UNIVERSE.w || cell.y >= UNIVERSE.h) return false;
    const here = this.planetsAt(cell)[0];
    const w = this.planets.find((x) => sameCell(x, cell));
    let order = null;
    if (kind === 'dock') {
      if (here?.owner.id !== this.me) return this.refuse('Ce n’est pas une de tes planètes.');
      order = { kind, key: here.key };
    } else if (kind === 'attack') {
      if (!here || here.owner.id === this.me) return this.refuse('Aucune planète adverse ici.');
      order = { kind, pid: here.owner.id, key: here.key };
    } else if (kind === 'colonize') {
      if (!w || here) return this.refuse('Cette planète n’est pas libre.');
      if (!f.ships.colony) return this.refuse(`Il faut un vaisseau colonisateur (${SHIPS[p.race].colony.name}) pour coloniser.`);
      order = { kind, world: w.id };
    }
    const err = moveTo(f, p.race, p.planet.tech, cell, order, this.now());
    if (err) return this.refuse(err);
    if (f.stranded) this.ontoast?.('Pas assez de carburant : la flotte tombera en panne en route.');
    // Au journal, seulement les ordres qui comptent : les simples déplacements le noieraient.
    const who = here && here.owner.id !== this.me ? ` (${here.owner.name})` : '';
    this.touch(order ? this.addLog(`La flotte ${de(p.name)} ${ORDERS[order.kind].verb} ${here ? here.name : w.name}${who}.`) : null);
    this.changed();
    return true;
  }

  /** Arrête une de mes flottes sur la case la plus proche. */
  stopFleet(id) {
    if (this.status !== 'playing') return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    if (!f) return false;
    const err = stopAt(f, p.race, p.planet.tech, this.now());
    if (err) return this.refuse(err);
    this.touch();
    this.changed();
    return true;
  }

  /** Plein d'une de mes flottes, arrêtée sur une de mes planètes, avec l'énergie de celle-ci. */
  refuelFleet(id) {
    if (this.status !== 'playing') return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    const now = this.now();
    if (!f || moving(f, now)) return this.refuse('La flotte doit être arrêtée pour faire le plein.');
    const here = this.planetsAt(f.to)[0];
    const pl = here?.owner.id === this.me && this.planetOf(p, here.key);
    if (!pl) return this.refuse('Le plein se fait en orbite d’une de tes planètes.');
    const give = refuel(pl.planet, f, p.race, now);
    if (!give) return this.refuse('Pas d’énergie à verser, ou réservoirs déjà pleins.');
    this.ontoast?.(`Plein : ${give} d’énergie.`);
    this.touch();
    this.changed();
    return true;
  }

  /** Renvoie une de mes flottes se poser sur sa planète de départ (ou la planète mère). */
  returnFleet(id) {
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    const back = f && (this.planetOf(p, f.origin) || this.planetOf(p, 'home'));
    if (!back) return this.refuse('Aucune planète où rentrer.');
    return this.moveFleet(id, back.cell, 'dock');
  }

  refuse(text) {
    this.ontoast?.(text);
    return false;
  }

  /** Pouvoir psychique (aliens), sur une de mes planètes. */
  power(key, where = 'home') {
    if (this.status !== 'playing') return;
    const p = this.state.players[this.me];
    const pl = p?.planet && this.myPlanet(where);
    if (!pl) return;
    const res = usePower(pl.planet, key, this.now());
    if (res.error) return this.ontoast?.(res.error);
    this.touch(this.addLog(`${p.name} ${res.text}.`));
    this.ontoast?.(`${POWERS[key].name} !`);
    this.changed();
  }

  /**
   * Je fais avancer moi-même ce qui m'appartient (l'affichage des autres se
   * calcule seul) : chantiers, recherches et vaisseaux terminés, arrivées de
   * mes flottes, et dégâts que d'autres m'ont infligés.
   */
  tick() {
    if (this.status !== 'playing' || !this.state) return;
    this.checkClaim();
    const p = this.state.players[this.me];
    if (!p?.planet) return;
    const now = this.now();
    let changed = false;
    this.tickLogs = []; // entrées du journal de ce passage, envoyées avec ma fiche
    for (const pl of this.planetsOf(p)) {
      const due = ['queue', 'research', 'yard'].some((k) => pl.planet[k] && pl.planet[k].end <= now);
      if (!due) continue;
      for (const d of settle(pl.planet, now)) {
        changed = true;
        const R = RACES[p.race];
        if (d.kind === 'queue') this.addLog(`${p.name} termine ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name}.`);
        else if (d.kind === 'research') {
          this.addLog(`${p.name} découvre ${TECHS[p.race][d.key].name} niv. ${d.level}.`);
          this.ontoast?.(`Recherche terminée : ${TECHS[p.race][d.key].name} niv. ${d.level}.`);
        } else this.addLog(`${p.name} reçoit ${d.count} × ${SHIPS[p.race][d.type].name} sur ${pl.name}.`);
      }
    }
    // Les technologies valent pour toutes mes planètes : chaque colonie en garde une copie.
    for (const pl of this.planetsOf(p)) {
      if (pl.key === 'home' || JSON.stringify(pl.planet.tech || {}) === JSON.stringify(p.planet.tech || {})) continue;
      settle(pl.planet, now);
      pl.planet.tech = { ...(p.planet.tech || {}) };
      changed = true;
    }
    for (const f of [...(p.fleets || [])]) if (f.order && !moving(f, now) && this.arrive(p, f)) changed = true;
    if (this.applyEffects(p, now)) changed = true;
    const logs = this.tickLogs;
    this.tickLogs = null;
    if (!changed) return;
    this.touch(logs.length ? logs : null);
    this.changed();
  }

  /** Arrivée d'une de mes flottes qui avait un ordre à exécuter. */
  arrive(p, f) {
    const order = f.order;
    f.order = null; // quoi qu'il arrive, la flotte attend ensuite en orbite
    const drop = () => (p.fleets = p.fleets.filter((x) => x.id !== f.id));
    const now = this.now();

    if (order.kind === 'dock') {
      const pl = this.planetOf(p, order.key);
      if (!pl || !sameCell(pl.cell, f.to) || this.ownerAt(pl.cell)?.id !== this.me) {
        this.addLog(`La flotte ${de(p.name)} ne trouve pas où se poser : elle reste en orbite.`);
        return true;
      }
      settle(pl.planet, now);
      pl.planet.ships ||= {};
      for (const [k, n] of Object.entries(f.ships)) pl.planet.ships[k] = (pl.planet.ships[k] || 0) + n;
      for (const [r, v] of Object.entries(f.cargo || {})) pl.planet.stock[r] = (pl.planet.stock[r] || 0) + v;
      pl.planet.stock.energy = (pl.planet.stock.energy || 0) + Math.floor(fuelAt(f, p.race, now)); // le carburant restant retourne au stock
      drop();
      const loot = lootText(f.cargo || {});
      this.addLog(`La flotte ${de(p.name)} se pose sur ${pl.name}${loot ? ` avec ${loot}` : ''}.`);
      return true;
    }

    if (order.kind === 'colonize') {
      const w = this.planets.find((x) => x.id === order.world);
      if (!w || this.ownerAt(w) || !f.ships.colony) {
        this.addLog(`${w?.name || 'La planète'} est déjà prise : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      const colony = newPlanet(p.race, f.arrive, w);
      colony.stock = { minerals: 0, food: 0, ...f.cargo, energy: Math.floor(fuelAt(f, p.race, now)) };
      colony.tech = { ...(p.planet.tech || {}) };
      colony.claimAt = f.arrive;
      const ships = { ...f.ships, colony: f.ships.colony - 1 };
      if (!ships.colony) delete ships.colony;
      colony.ships = ships;
      p.colonies = { ...(p.colonies || {}), [w.id]: colony };
      drop();
      this.addLog(`${p.name} fonde une colonie sur ${w.name}.`);
      this.ontoast?.(`Colonie fondée sur ${w.name} !`);
      return true;
    }

    if (order.kind === 'attack') {
      const enemy = this.state.players[order.pid];
      const pl = enemy && this.planetOf(enemy, order.key);
      if (!pl || !sameCell(pl.cell, f.to)) return true;
      // Je calcule le combat avec ce que je sais du défenseur à l'heure de l'arrivée ;
      // son téléphone appliquera ses pertes en lisant mon rapport.
      const def = stateAt(pl.planet, f.arrive);
      const res = battle({ race: p.race, ships: f.ships, tech: p.planet.tech }, { race: enemy.race, ships: def.ships, tech: def.tech });
      const take = res.won ? plunder(p.race, res.attLeft, def.stock, f.cargo) : {};
      // Un identifiant par combat : une même flotte peut attaquer plusieurs fois.
      p.effects = [...(p.effects || []), { id: rid(8), to: enemy.id, key: pl.key, at: f.arrive, ships: res.defLost, take }].slice(-60);
      const loot = lootText(take);
      this.addLog(
        res.won
          ? `${p.name} remporte le combat sur ${pl.name} (${enemy.name})${loot ? ` et pille ${loot}` : ''}.`
          : `${p.name} perd le combat sur ${pl.name} (${enemy.name}).`,
      );
      this.ontoast?.(res.won ? `Victoire sur ${pl.name} !` : `Défaite sur ${pl.name}.`);
      if (!countShips(res.attLeft)) return drop(), true;
      setShips(f, p.race, res.attLeft, now);
      f.cargo = Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + (take[r] || 0)]));
      return true;
    }
    return true;
  }

  /**
   * Dégâts qu'un autre joueur m'a infligés : il les a inscrits dans sa
   * fiche (je suis le seul à écrire la mienne), je les applique une fois.
   */
  applyEffects(p, now) {
    p.applied ||= [];
    let any = false;
    for (const other of Object.values(this.state.players)) {
      if (other.id === this.me) continue;
      for (const e of other.effects || []) {
        if (e.to !== this.me || p.applied.includes(e.id)) continue;
        p.applied = [...p.applied, e.id].slice(-200);
        any = true;
        const pl = this.planetOf(p, e.key);
        if (!pl) continue;
        settle(pl.planet, now);
        pl.planet.ships ||= {};
        for (const [k, n] of Object.entries(e.ships || {})) pl.planet.ships[k] = Math.max(0, (pl.planet.ships[k] || 0) - n);
        for (const [r, v] of Object.entries(e.take || {})) pl.planet.stock[r] = Math.max(0, (pl.planet.stock[r] || 0) - v);
        const lost = countShips(e.ships);
        const loot = lootText(e.take || {});
        const ships = lost ? `${lost} vaisseau${lost > 1 ? 'x' : ''} perdu${lost > 1 ? 's' : ''}` : 'aucun vaisseau perdu';
        this.addLog(`${pl.name} (${p.name}) est attaquée par ${other.name} : ${ships}${loot ? `, ${loot} pillés` : ''}.`);
        this.ontoast?.(`${other.name} attaque ${pl.name} !`);
      }
    }
    return any;
  }

  addLog(text) {
    const entry = { at: this.now(), text };
    this.pushLog(entry);
    this.tickLogs?.push(entry);
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

  /** Un autre joueur a une version plus récente de l'appli. */
  get outdated() {
    return Object.values(this.state?.players || {}).some((p) => (p.v || 0) > FORMAT);
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
