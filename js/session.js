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
import { saveGame, loadGame, mergeStates, loadIdentity, saveIdentity } from './save.js';
import { newPlanet, settle, stateAt, startBuild, startDemolish, startResearch, startShips, usePower, PLAN_MAX, RACES, RES_INFO, POWERS, planetsFor, sameCell, SOIL, UNIVERSE, usedPlaces, empireScore, frostAt, sunFor, fortOf, seeded } from './game.js';
import { TECHS, SHIPS, sightRange, TEMPO } from './tech.js';
import { launch, battle, plunder, moveTo, stopAt, moving, countShips, fuelAt, fuelNeed, refuel, together, transfer, split, merge, intercept, inContact, firstContact, salvage, applyLosses, parkedCell, fleetPos, fleetCargo, fleetTank, ORDERS, MAX_FLEETS, STANCES, aggressive, armed } from './fleet.js';
import { amounts, isEmpty, holdings, lacks, noRoom, take, put, outcome, OFFER_MS, MAX_OFFERS, GRACE_MS } from './trade.js';

/** « de Beta », « d'Alpha ». */
const de = (name) => (/^[aeiouyhàâéèêëîïôöûü]/i.test(name) ? `d’${name}` : `de ${name}`);

/**
 * Version du format des fiches. Chaque téléphone écrit la sienne dans sa
 * fiche : un joueur qui voit une fiche plus récente doit recharger l'appli.
 * 2 : flottes pilotées librement sur la carte.
 * 3 : carburant des flottes.
 * 4 : flottes fusionnées (`absorbed`).
 * 5 : combats entre flottes (effets visant une flotte, `docked`).
 * 6 : échanges entre joueurs (`offers`, `answers`).
 * 7 : journal des ordres (`orders`), messages envoyés en morceaux.
 * 8 : tempo ×2,5, score de tout l'empire, froid, prise de planète, élimination (`out`) et fin (`over`).
 * 9 : départ quand tous les joueurs présents sont prêts (`ready`, `go`), flotte de départ
 *     avec un seul colonisateur qui fonde la planète mère.
 */
export const FORMAT = 9;

const shipsText = (n) => `${n} vaisseau${n > 1 ? 'x' : ''}`;
/** Technologies d'un joueur : celles de sa planète mère (aucune tant qu'il n'en a pas). */
const techOf = (p) => p?.planet?.tech || {};

/** « 173 minéraux et 37 nourriture » (vide si rien). */
function lootText(take) {
  const parts = Object.entries(take)
    .filter(([, v]) => v > 0)
    .map(([r, v]) => `${v} ${RES_INFO[r].name.toLowerCase()}`);
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0] || '';
}

const COLORS = ['#7aa2ff', '#ff9f6b', '#7cf0b4', '#f7d06b', '#d38bff', '#6fd3ff', '#ff7a93', '#b7e36b'];
const MAX_PLAYERS = 8;
/** Rayon (en cases) du cercle autour du soleil où les flottes de départ apparaissent. */
const START_RING = 7;
/** Une même planète ne se pille qu'une fois toutes les 2 min (au tempo d'origine). */
const RAID_COOLDOWN_MS = (2 * 60_000) / TEMPO;
/**
 * Rapports de combat gardés dans ma fiche. Un rapport s'efface dès que sa
 * cible l'a appliqué : cette limite ne sert que pour une cible qui ne
 * revient jamais.
 */
const MAX_EFFECTS = 300;
/** Entrées gardées dans mon carnet (combats et planètes perdues, sur ce téléphone seulement). */
const JOURNAL_MAX = 100;
const HEARTBEAT_MS = 1500;
// Sans nouvelles depuis ce délai, la connexion est considérée perdue (un
// écran verrouillé quelques secondes ne doit pas faire sortir de la partie).
const SILENCE_MS = 30000;
/**
 * Ordres gardés dans la fiche d'un joueur, pour rejouer la partie
 * (js/replay.js). La fiche voyage à chaque changement : au-delà, les plus
 * anciens s'effacent et la partie ne se rejoue plus depuis le début.
 */
export const MAX_ORDERS = 1500;

function rid(n = 8) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fiche d'un joueur au format actuel. Avant les races, les planètes
 * produisaient métal, cristal et deutérium : une fiche sans race n'a pas
 * encore de planète, son joueur choisira sa race en revenant.
 */
export function normalize(p) {
  delete p.pos; // vaisseaux d'avant : on ne se déplace plus sur la carte
  // Nom et couleur viennent d'un autre téléphone et finissent à l'écran : bornés et vérifiés.
  p.name = String(p.name ?? 'Joueur').slice(0, 16) || 'Joueur';
  if (typeof p.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(p.color)) p.color = COLORS[0];
  if (!Object.hasOwn(RACES, p.race)) {
    p.race = null;
    p.planet = null;
  }
  // Une fiche vient d'un autre téléphone, peut-être abîmée ou trafiquée : ce qui
  // n'a pas la bonne forme est écarté, plutôt que de faire planter chaque passage.
  if (p.planet && !planetOk(p.race, p.planet)) p.planet = null;
  // Colonies, flottes en route, dégâts infligés aux autres (et reçus, déjà appliqués).
  if (!isObj(p.colonies)) p.colonies = {};
  for (const [id, c] of Object.entries(p.colonies)) if (!planetOk(p.race, c)) delete p.colonies[id];
  if (!Array.isArray(p.fleets)) p.fleets = [];
  p.fleets = p.fleets.filter((f) => isObj(f) && isCell(f.from) && isCell(f.to) && isObj(f.ships));
  p.fleets.forEach(upgradeFleet);
  if (!Array.isArray(p.effects)) p.effects = [];
  p.effects = p.effects.filter((e) => isObj(e) && typeof e.to === 'string' && typeof e.id === 'string').map(cleanEffect);
  if (!Array.isArray(p.applied)) p.applied = [];
  if (!isObj(p.raided)) p.raided = {};
  p.applied = p.applied.filter((id) => typeof id === 'string');
  // Mes combats de flottes récents (pour ne pas compter deux fois un même combat livré des deux côtés).
  if (!Array.isArray(p.engaged)) p.engaged = [];
  // Flottes posées : id -> planète, pour que les dégâts qui les visaient encore les trouvent.
  if (!p.docked || typeof p.docked !== 'object') p.docked = {};
  // Échanges : mes offres en cours (avec leur séquestre), mes réponses à celles des autres.
  if (!Array.isArray(p.offers)) p.offers = [];
  p.offers = p.offers.filter((o) => isObj(o) && isObj(o.to) && isObj(o.from) && typeof o.to.pid === 'string' && Number.isFinite(o.expires));
  for (const o of p.offers) {
    o.give = cleanAmounts(o.give);
    o.want = cleanAmounts(o.want);
  }
  if (!Array.isArray(p.dropped)) p.dropped = [];
  p.dropped = p.dropped.filter((d) => isObj(d) && typeof d.id === 'string' && typeof d.pid === 'string' && Number.isFinite(d.expires) && Number.isFinite(d.at));
  for (const d of p.dropped) {
    d.give = cleanAmounts(d.give);
    d.want = cleanAmounts(d.want);
  }
  if (!Array.isArray(p.answers)) p.answers = [];
  p.answers = p.answers.filter((a) => isObj(a) && typeof a.offer === 'string');
  // Journal des ordres : { t, k, a?, ids?, s? } (heure, ordre ou « tick », arguments,
  // identifiants tirés, entrées des journaux des autres connues quand ce nombre a changé).
  if (!Array.isArray(p.orders)) p.orders = [];
  if (p.deathPts !== undefined && !Number.isFinite(p.deathPts)) delete p.deathPts;
  // Prêt (heure) et départ de la partie vu par ce joueur (heure) : des nombres, ou rien.
  for (const k of ['ready', 'go']) if (p[k] !== undefined && !Number.isFinite(p[k])) delete p[k];
  return p;
}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const isCell = (c) => isObj(c) && Number.isFinite(c.x) && Number.isFinite(c.y);
/** Planète utilisable : stock, niveaux, et un chantier en cours sur un vrai bâtiment de sa race. */
function planetOk(race, pl) {
  if (!isObj(pl) || !isObj(pl.stock) || !isObj(pl.levels) || !Number.isFinite(pl.at)) return false;
  // Gisements : pour chaque ressource du sol, un maximum et une repousse, et ce qu'il en reste.
  const soilOk = isObj(pl.nature) && isObj(pl.reserve) && SOIL.every((r) => !pl.nature[r] || (isObj(pl.nature[r]) && Number.isFinite(pl.nature[r].max) && Number.isFinite(pl.nature[r].regen) && Number.isFinite(pl.reserve[r])));
  if (!soilOk) {
    delete pl.nature;
    delete pl.reserve;
  }
  if (pl.climate !== undefined && !(isObj(pl.climate) && ['heat', 'energy', 'minerals', 'food'].every((k) => Number.isFinite(pl.climate[k])))) delete pl.climate;
  if (pl.places !== undefined && !(Number.isInteger(pl.places) && pl.places > 0)) delete pl.places;
  if (pl.queue && !(isObj(pl.queue) && race && Object.hasOwn(RACES[race].buildings, pl.queue.key))) pl.queue = null;
  // Fil de construction : des noms de bâtiments de la race, PLAN_MAX au plus.
  if (pl.plan !== undefined) pl.plan = Array.isArray(pl.plan) && race ? pl.plan.filter((k) => typeof k === 'string' && Object.hasOwn(RACES[race].buildings, k)).slice(0, PLAN_MAX) : [];
  // Niveaux : seulement les bâtiments de la race, en entiers positifs (un niveau négatif libérerait des places).
  if (race) pl.levels = Object.fromEntries(Object.keys(RACES[race].buildings).map((k) => [k, Math.max(0, Math.floor(Number(pl.levels[k]) || 0))]));
  return true;
}
/** Quantités d'un rapport ou d'un échange : des nombres finis, positifs, bornés. */
const MAX_AMOUNT = 1e7;
function cleanAmounts(o) {
  if (!isObj(o)) return {};
  return Object.fromEntries(
    Object.entries(o)
      .filter(([k, v]) => !['__proto__', 'constructor', 'prototype'].includes(k) && Number.isFinite(v) && v > 0)
      .map(([k, v]) => [k, Math.min(v, MAX_AMOUNT)]),
  );
}
const cleanEffect = (e) => ({ ...e, ships: cleanAmounts(e.ships), take: cleanAmounts(e.take), ack: Array.isArray(e.ack) ? e.ack.filter((x) => typeof x === 'string').slice(0, 20) : [] });

/** Identifiant de joueur acceptable (pas de clé spéciale comme __proto__). */
export const pidOk = (pid) => typeof pid === 'string' && /^[A-Za-z0-9-]{1,24}$/.test(pid);

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
    s.journal = saved.journal || null; // avant le rattrapage : les combats de l'absence s'y inscrivent
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
      setInterval(() => {
        this.tick();
        this.checkStart();
      }, 250),
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

  /**
   * Heure de la partie : celle du téléphone (réglée automatiquement par le
   * réseau). Figée le temps d'un ordre, pour qu'il se rejoue à l'identique.
   */
  now() {
    return this.entry?.t ?? Date.now();
  }

  /**
   * Identifiant neuf (flotte, offre, rapport de combat). Noté avec l'ordre
   * en cours : un ordre suivant peut le viser, le rejeu doit retrouver le même.
   */
  newId(n) {
    const id = this.replayIds?.length ? this.replayIds.shift() : rid(n);
    if (this.entry) (this.entry.ids ||= []).push(id);
    return id;
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
    // Son secret se vérifie avec ce que je savais avant de lire sa copie (elle pourrait le remplacer).
    const knownHash = msg.gid === this.state.gid && pidOk(msg.pid) ? this.state.players[msg.pid]?.secretHash : null;
    // Il apporte sa copie de la partie : on garde ce qu'elle a de plus récent.
    this.mergeIn(msg.copy, link);
    const st = this.state;
    const known = msg.gid === st.gid && pidOk(msg.pid) && st.players[msg.pid];
    if (known && typeof msg.secret === 'string' && (await sha256(msg.secret)) === (knownHash || known.secretHash)) {
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
    // Mon carnet de combats de cette partie, s'il est sur ce téléphone (même joueur).
    if (mine && mine.state.gid === st.gid && mine.me === msg.you) this.journal = mine.journal || null;
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
    if (!st?.players || typeof st.players !== 'object' || st.gid !== this.state?.gid) return;
    const before = this.state;
    const incoming = clean({ ...st, players: {} });
    let count = Object.keys(before.players).length;
    for (const [pid, rec] of Object.entries(st.players)) {
      if (!this.recordOk(pid, rec)) continue;
      if (!before.players[pid] && count++ >= MAX_PLAYERS * 2) continue;
      incoming.players[pid] = normalize(JSON.parse(JSON.stringify(rec)));
    }
    const merged = mergeStates(before, incoming);
    delete merged.epoch;
    delete merged.nextRank;
    this.state = merged;
    this.refreshOnline();
    for (const [pid, p] of Object.entries(merged.players)) {
      if ((p.actAt || 0) > (before.players[pid]?.actAt || 0)) this.spread(p, null, from);
    }
    this.changed();
  }

  /**
   * Une fiche d'un autre téléphone est-elle acceptable ? Personne d'autre que
   * moi n'écrit la mienne ; le secret d'un joueur ne change jamais ; une fiche
   * datée loin dans le futur bloquerait les vraies (elles paraîtraient plus vieilles).
   */
  recordOk(pid, rec) {
    if (!pidOk(pid) || !isObj(rec) || rec.id !== pid || pid === this.me) return false;
    // Un téléphone peut être en avance de quelques minutes ou heures (horloge mal réglée) : seule une
    // date absurde (plus d'un jour d'avance) est refusée, elle figerait sa fiche chez tout le monde.
    if (!(Number.isFinite(rec.actAt) || rec.actAt === undefined) || (rec.actAt || 0) > this.now() + 24 * 3_600_000) return false;
    const ours = this.state?.players[pid];
    // Installation antidatée : une planète que sa fiche ne montrait pas encore quand je l'ai vue,
    // mais datée d'avant cette fiche. Une vraie installation est toujours datée d'après.
    if (ours && (rec.actAt || 0) > (ours.actAt || 0) && this.backdated(ours, rec)) return false; // une fiche plus vieille est ignorée de toute façon
    if (ours?.secretHash && rec.secretHash !== ours.secretHash) return false;
    return true;
  }

  /**
   * La fiche `rec` revendique-t-elle une planète mère avec une date d'avant
   * la fiche `ours` qui ne l'avait pas ? (Une colonie, elle, est datée de
   * l'arrivée de sa flotte, qui peut précéder la dernière fiche : pas ici.)
   */
  backdated(ours, rec) {
    // Une de ses colonies devenue planète mère (l'ancienne est perdue) garde sa date : ce n'est pas une installation.
    if (isCell(rec.home) && Object.keys(ours.colonies || {}).some((id) => sameCell(this.planets.find((w) => w.id === id), rec.home))) return false;
    // Planète mère fondée par un colonisateur : datée de son arrivée, que la fiche montrait déjà en route.
    if (isCell(rec.home) && (ours.fleets || []).some((f) => f.order?.kind === 'colonize' && sameCell(f.to, rec.home) && Math.abs(f.arrive - rec.claimAt) < 1)) return false;
    // Marge d'une minute : plusieurs ordres dans la même milliseconde font avancer l'heure de la fiche d'un cran chacun.
    return isCell(rec.home) && !sameCell(rec.home, ours.home) && Number.isFinite(rec.claimAt) && rec.claimAt < (ours.actAt || 0) - 60_000;
  }

  /** Fiche d'un joueur, reçue de proche en proche. */
  onRecord(link, rec, log) {
    if (!rec || typeof rec.id !== 'string' || !this.state || !this.recordOk(rec.id, rec)) return;
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
    // L'ordre (ou le passage) qui a changé ma fiche rejoint mon journal, une fois.
    if (this.entry && !this.entryKept) {
      this.entryKept = true;
      p.orders = [...(p.orders || []), this.entry].slice(-MAX_ORDERS);
    }
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
      // À l'arrivée, on choisit sa race (une fois pour toutes), puis on se dit prêt (D-120).
      race: null,
      planet: null,
      home: null,
      online: true,
      actAt: now, // dernière modification de la fiche (sert à garder la plus récente)
    };
  }

  /** On peut jouer : partie en cours, pas finie, et je ne suis pas éliminé. */
  get canAct() {
    return this.status === 'playing' && !this.over && !this.state?.players[this.me]?.out;
  }

  /** Points de l'empire d'un joueur (toutes ses planètes, ses recherches, ses vaisseaux). */
  scoreOf(p) {
    if (!p?.race) return 0;
    return empireScore(p.race, this.planetsOf(p).map((x) => x.planet), p.fleets || []);
  }

  /**
   * Début de la course : le départ donné quand tous les joueurs présents étaient prêts (`go`, le
   * plus ancien vu par un joueur). Une partie d'avant le départ commun partait à la première
   * installation (`since`). null : pas encore partie (ou partie d'avant la course, sans fin).
   */
  get startedAt() {
    const players = Object.values(this.state?.players || {});
    const go = players.map((p) => p.go).filter(Number.isFinite);
    if (go.length) return Math.min(...go);
    const t = players.map((p) => p.since).filter(Number.isFinite);
    return t.length ? Math.min(...t) : null;
  }

  /**
   * Le joueur est-il dans la course ? Entré (`since`), ou prêt au départ d'une partie partie
   * (son téléphone n'a peut-être pas encore fait apparaître sa flotte).
   */
  inRace(p) {
    return Number.isFinite(p?.since) || (Number.isFinite(p?.ready) && this.startedAt != null);
  }

  /** Joueurs présents (moi, et ceux en ligne avec moi) pas encore prêts ni déjà dans la course. */
  get notReady() {
    return Object.values(this.state?.players || {}).filter(
      (p) => (p.id === this.me || p.online) && !p.out && !p.home && !Number.isFinite(p.ready) && !Number.isFinite(p.since),
    );
  }

  /**
   * Prêt à partir (`on`), ou plus prêt tant que la partie n'est pas partie. Elle part quand tous
   * les joueurs présents sont prêts (checkStart). Prêt après le départ : ma flotte arrive aussitôt.
   */
  ready(on = true) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    if (!p?.race) return this.refuse('Choisis d’abord ta race.');
    if (p.home || Number.isFinite(p.since)) return false; // déjà dans la course
    if (on) {
      if (Number.isFinite(p.ready)) return false;
      p.ready = this.now();
      this.touch(this.addLog(`${p.name} est prêt.`));
    } else {
      if (!Number.isFinite(p.ready) || this.startedAt != null) return false;
      delete p.ready;
      this.touch(this.addLog(`${p.name} n’est plus prêt.`));
    }
    this.changed();
    return true;
  }

  /** Départ de la partie, à cette heure (checkStart : tous les joueurs présents sont prêts). */
  begin() {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    if (!Number.isFinite(p?.ready) || this.startedAt != null) return false;
    p.go = this.now();
    this.touch(this.addLog('Tous les joueurs présents sont prêts : la partie commence.'));
    this.changed();
    return true;
  }

  /** Je suis prêt, les joueurs présents aussi, et la partie n'est pas partie : je donne le départ. */
  checkStart() {
    if (this.status !== 'playing' || !this.state || this.startedAt != null) return false;
    if (!Number.isFinite(this.state.players[this.me]?.ready) || this.notReady.length) return false;
    return this.begin();
  }

  /**
   * Partie partie, moi prêt et pas encore dans la course : ma flotte de départ, un seul
   * colonisateur, le plein fait, apparaît sur la carte (au départ, ou quand je suis prêt si
   * c'est après). Elle doit aller fonder ma planète mère sur une planète libre.
   */
  enterRace(p, now) {
    const start = this.startedAt;
    if (start == null || !Number.isFinite(p.ready) || Number.isFinite(p.since) || p.home || p.out) return false;
    p.fleets ||= [];
    if (p.fleets.length >= MAX_FLEETS) return false;
    const at = Math.min(now, Math.max(start, p.ready));
    const ships = { colony: 1 };
    const cell = this.startCell(p, start);
    p.fleets.push({ id: this.newId(6), ships, cargo: { minerals: 0, food: 0 }, fuel: fleetTank(p.race, ships), origin: 'home', from: cell, to: { ...cell }, depart: at, arrive: at, order: null, stance: 'passive' });
    p.since = at;
    this.addLog(`${p.name} entre dans la partie avec un seul vaisseau : ${SHIPS[p.race].colony.name}.`);
    this.ontoast?.(`Ta flotte de départ (${SHIPS[p.race].colony.name}) est sur la carte : envoie-la fonder ta planète mère sur une planète libre.`, 8000);
    return true;
  }

  /**
   * Case de départ d'un joueur. Ceux qui étaient prêts au départ sont répartis à égale distance
   * les uns des autres sur un cercle de START_RING cases autour du soleil (même chance pour
   * tous) ; un retardataire tombe sur ce cercle à un endroit tiré de son identifiant. Jamais
   * sur une planète : on glisse le long du cercle jusqu'à une case vide.
   */
  startCell(p, start) {
    const sun = sunFor(this.state.gid);
    const mid = { x: sun.x + sun.size / 2, y: sun.y + sun.size / 2 };
    const first = Object.values(this.state.players)
      .filter((o) => Number.isFinite(o.ready) && o.ready <= start)
      .sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
    const i = first.findIndex((o) => o.id === p.id);
    const k = i >= 0 ? seeded(`${this.state.gid}/depart`)() + i / first.length : seeded(`${this.state.gid}/depart/${p.id}`)();
    const clamp = (v, hi) => Math.min(hi - 1, Math.max(0, v));
    let cell = null;
    for (let step = 0; step < 32; step++) {
      // 0, +1, −1, +2, −2… crans de 1/64 de tour.
      const a = 2 * Math.PI * (k + (step % 2 ? 1 : -1) * Math.ceil(step / 2) / 64);
      cell = { x: clamp(Math.floor(mid.x + START_RING * Math.cos(a)), UNIVERSE.w), y: clamp(Math.floor(mid.y + START_RING * Math.sin(a)), UNIVERSE.h) };
      if (!this.planets.some((w) => sameCell(w, cell))) break;
    }
    return cell;
  }

  /** Dans la course sans planète, et plus aucun colonisateur (détruit, donné) : éliminé. */
  noColonizer(p, now) {
    if (!Number.isFinite(p.ready) || !Number.isFinite(p.since) || p.home || p.out != null) return false;
    if ((p.fleets || []).some((f) => f.ships?.colony > 0)) return false;
    p.deathPts = this.scoreOf(p);
    p.out = now;
    this.addLog(`${p.name} n’a plus de colonisateur pour fonder sa planète : ${p.name} est éliminé.`);
    this.ontoast?.('Plus de colonisateur pour fonder ta planète : tu es éliminé.', 8000);
    this.note(p, { at: now, kind: 'planet', tone: 'bad', text: 'Plus de colonisateur pour fonder ta planète : tu es éliminé.' });
    return true;
  }

  /** Heure à laquelle le froid prend la case `cell` (Infinity : partie sans froid). */
  frostOf(cell) {
    const start = this.startedAt;
    if (start == null) return Infinity;
    if (this.sunCache?.gid !== this.state.gid) this.sunCache = { gid: this.state.gid, sun: sunFor(this.state.gid) };
    return frostAt(this.sunCache.sun, start, cell);
  }

  /** Planètes encore en vie d'un joueur : ni gelées, ni prises. */
  livePlanets(p, now = this.now()) {
    if (p?.out) return [];
    return this.planetsOf(p).filter((pl) => this.frostOf(pl.cell) > now && this.ownerAt(pl.cell)?.id === p.id);
  }

  /** Heure à laquelle un joueur a tout perdu, ou null s'il est encore en vie. Calculable par tous, même s'il est hors ligne. */
  deadAt(p, now = this.now()) {
    if (!p?.race || !Number.isFinite(p.since)) return null;
    if (Number.isFinite(p.out)) return p.out;
    const all = this.planetsOf(p);
    if (!all.length || this.livePlanets(p, now).length) return null;
    const frozen = all.map((pl) => this.frostOf(pl.cell)).filter((t) => t <= now);
    return frozen.length === all.length ? Math.max(...frozen) : now;
  }

  /** Fin de la partie, ou null : { at, winner }, la plus ancienne qu'un joueur a vue. */
  get over() {
    const players = this.state?.players || {};
    const seen = Object.values(players).map((p) => p.over).filter((o) => isObj(o) && Number.isFinite(o.at) && Object.hasOwn(players, o.winner));
    if (!seen.length) return null;
    return seen.sort((a, b) => a.at - b.at || (a.winner < b.winner ? -1 : 1))[0];
  }

  /**
   * Classement : [{ id, pts, dead, best }], les vivants d'abord, puis les derniers tombés, puis
   * les points. `pts` : ce que le joueur a maintenant (0 s'il a tout perdu). `best` départage :
   * pour un joueur tombé, ses points juste avant sa chute (`deathPts`) ; une fiche qui n'a pas
   * encore vu sa chute a encore ses planètes, donc ces mêmes points.
   */
  ranking(now = this.now()) {
    return Object.values(this.state?.players || {})
      .filter((p) => p.race && (p.planet || this.inRace(p)))
      .map((p) => {
        const pts = this.scoreOf(p);
        const dead = this.deadAt(p, now);
        return { id: p.id, pts, dead, best: dead != null ? (p.deathPts ?? pts) : pts };
      })
      .sort((a, b) => (a.dead ?? Infinity) !== (b.dead ?? Infinity) ? (b.dead ?? Infinity) - (a.dead ?? Infinity) : b.best - a.best || (a.id < b.id ? -1 : 1));
  }

  /**
   * La partie est-elle finie ? À plusieurs : quand il ne reste qu'un joueur
   * en vie (ou aucun : le dernier tombé gagne). Seul : quand le froid a tout
   * pris. Si oui, je l'inscris dans ma fiche.
   */
  checkOver(p, now) {
    if (this.over || this.startedAt == null) return false;
    const rank = this.ranking(now).filter((r) => this.inRace(this.state.players[r.id]));
    const alive = rank.filter((r) => r.dead == null);
    if (!rank.length || alive.length > (rank.length > 1 ? 1 : 0)) return false;
    const winner = rank[0];
    const at = Math.max(...rank.map((r) => r.dead ?? -Infinity));
    p.over = { at: Number.isFinite(at) ? at : now, winner: winner.id };
    this.addLog(`Fin de la partie : ${this.state.players[winner.id].name} l'emporte${alive.length ? ', dernier en vie' : ''}.`);
    return true;
  }

  /**
   * Je perds une de mes planètes (gel ou prise) à l'heure `at`. Ma planète
   * mère perdue, ma plus vieille colonie en vie la remplace ; sans colonie,
   * je suis éliminé.
   */
  losePlanet(p, key, at, why) {
    const pl = this.planetOf(p, key);
    if (!pl) return;
    // Points d'avant la vague : toutes les planètes perdues à la même heure comptent dans `deathPts`.
    if (this.wave?.pid !== p.id || this.wave.at !== at) this.wave = { pid: p.id, at, pts: this.scoreOf(p) };
    if (key !== 'home') {
      const colonies = { ...p.colonies };
      delete colonies[key];
      p.colonies = colonies;
      this.addLog(`${p.name} perd sa colonie ${pl.name} (${why}).`);
      this.ontoast?.(`Colonie ${pl.name} perdue (${why}).`);
      this.note(p, { at, kind: 'planet', tone: 'bad', text: `Colonie ${pl.name} perdue (${why}).` });
      return;
    }
    const next = this.livePlanets(p, at)
      .filter((x) => x.key !== 'home')
      .sort((a, b) => (a.planet.claimAt || 0) - (b.planet.claimAt || 0) || (a.key < b.key ? -1 : 1))[0];
    if (!next) {
      p.home = null;
      p.out = at;
      p.deathPts = this.wave.pts;
      this.addLog(`${p.name} perd ${pl.name} (${why}) : plus aucune planète, ${p.name} est éliminé.`);
      this.ontoast?.(`${pl.name} perdue (${why}) : tu es éliminé.`, 8000);
      this.note(p, { at, kind: 'planet', tone: 'bad', text: `${pl.name} perdue (${why}) : tu es éliminé.` });
      return;
    }
    const colonies = { ...p.colonies };
    delete colonies[next.key];
    settle(next.planet, at);
    p.colonies = colonies;
    p.home = { ...next.cell };
    p.claimAt = next.planet.claimAt || at;
    p.planet = next.planet;
    this.addLog(`${p.name} perd ${pl.name} (${why}) : ${next.name} devient sa planète mère.`);
    this.ontoast?.(`${pl.name} perdue (${why}) : ${next.name} devient ta planète mère.`);
    this.note(p, { at, kind: 'planet', tone: 'bad', text: `${pl.name} perdue (${why}) : ${next.name} devient ta planète mère.` });
  }

  /** Le froid prend mes planètes qu'il a atteintes, la plus lointaine d'abord. */
  freeze(p, now) {
    let any = false;
    for (;;) {
      const pl = this.planetsOf(p)
        .map((x) => ({ ...x, at: this.frostOf(x.cell) }))
        .filter((x) => x.at <= now)
        .sort((a, b) => a.at - b.at)[0];
      if (!pl) return any;
      this.losePlanet(p, pl.key, pl.at, 'gelée');
      any = true;
    }
  }

  /** Ma race, ou null tant que je ne l'ai pas choisie. */
  get myRace() {
    return this.state?.players[this.me]?.race || null;
  }

  /** Choix de race : une seule fois, il ne se défait pas. */
  chooseRace(race) {
    if (!this.canAct || !RACES[race]) return false;
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
    const players = Object.values(this.state?.players || {});
    // Prise par un attaquant dont le rapport n'est pas encore lu : elle n'est déjà plus à son ancien propriétaire.
    const taken = players.flatMap((o) => (o.effects || []).filter((e) => e.capture && sameCell(e.cell, cell)));
    const lost = (p, t) => taken.some((e) => e.to === p.id && e.at >= t);
    for (const p of players) {
      const t = p.claimAt || p.rank || 0;
      if (sameCell(p.home, cell) && !lost(p, t)) consider(p, t);
      const col = w && p.colonies?.[w.id];
      if (col && !lost(p, col.claimAt || 0)) consider(p, col.claimAt || 0);
    }
    return best?.p || null;
  }

  /**
   * La planète `w` est-elle déjà à un autre joueur installé avant l'heure
   * `at` (départagé comme ownerAt, par identifiant à égalité) ?
   */
  takenBefore(w, at) {
    const owner = this.ownerAt(w);
    if (!owner || owner.id === this.me) return !!owner;
    const t = sameCell(owner.home, w) ? owner.claimAt || owner.rank || 0 : owner.colonies?.[w.id]?.claimAt || 0;
    return t < at || (t === at && owner.id < this.me);
  }

  /** Ma planète de l'univers (avec ses gisements de départ), ou null. */
  get myWorld() {
    const home = this.state?.players[this.me]?.home;
    return (home && this.planets.find((w) => sameCell(w, home))) || null;
  }

  /** M'installer sur une planète libre : une fois la race choisie, au début de la partie. */
  claimPlanet(id) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const w = this.planets.find((x) => x.id === id);
    if (!p?.race || !w) return false;
    if (p.home) {
      this.ontoast?.('Tu as déjà une planète.');
      return false;
    }
    // Depuis le départ commun, la planète mère se fonde avec le colonisateur de départ.
    if (Number.isFinite(p.ready)) return this.refuse('Envoie ton colonisateur sur une planète libre : il y fondera ta planète mère.');
    if (p.out) {
      this.ontoast?.('Tu as perdu toutes tes planètes : tu es éliminé.');
      return false;
    }
    if (this.frostOf(w) <= this.now()) {
      this.ontoast?.(`${w.name} est gelée.`);
      return false;
    }
    if (w.kind && w.kind !== 'planet') {
      this.ontoast?.(`${w.name} est trop petit pour une planète mère : on peut seulement le coloniser.`);
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
    p.since ??= now; // entrée dans la course (les parties d'avant la course n'en ont pas)
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
    // Une planète prise au combat n'est pas une installation simultanée : applyEffects la retire.
    const captured = (cell) => Object.values(this.state.players).some((o) => (o.effects || []).some((e) => e.capture && e.to === this.me && sameCell(e.cell, cell)));
    for (const id of Object.keys(p.colonies || {})) {
      const w = this.planets.find((x) => x.id === id);
      const owner = w && this.ownerAt(w);
      if (!owner || owner.id === this.me || captured(w)) continue;
      const fleet = this.evacuate(p, p.colonies[id], w);
      delete p.colonies[id];
      const after = fleet ? ` : la flotte ${de(p.name)} reste en orbite avec ${shipsText(countShips(fleet.ships))}` : '';
      this.touch(this.addLog(`${owner.name} a fondé sa colonie sur ${w.name} juste avant ${p.name}${after}.`));
      this.changed();
    }
    if (!p.home) return;
    const owner = this.ownerAt(p.home);
    if (!owner || owner.id === this.me || captured(p.home)) return;
    const w = this.myWorld;
    // Fondée par mon colonisateur : il repart en orbite (avec ce que la planète avait), pour en chercher une autre.
    const back = Number.isFinite(p.ready) && w ? this.evacuate(p, p.planet, w) : null;
    p.home = null;
    p.planet = null;
    delete p.claimAt;
    this.touch();
    this.ontoast?.(`${owner.name} s'est installé sur ${w?.name || 'cette planète'} juste avant toi : ${back ? 'ton colonisateur reste en orbite, envoie-le sur une autre' : 'choisis-en une autre'}.`);
    this.changed();
  }


  /**
   * Colonie perdue au profit d'un joueur arrivé avant moi : comme si ma
   * flotte de colonisation l'avait trouvée prise en arrivant, ses
   * vaisseaux (colonisateur compris), ce qui tient dans leurs soutes et
   * leurs réservoirs repartent en flotte, en orbite. Renvoie cette flotte.
   */
  evacuate(p, colony, w) {
    const now = this.now();
    p.fleets ||= [];
    if (!colony || p.fleets.length >= MAX_FLEETS) return null;
    settle(colony, now);
    colony.ships = { ...(colony.ships || {}), colony: (colony.ships?.colony || 0) + 1 };
    let room = fleetCargo(p.race, colony.ships);
    const cargo = {};
    for (const r of SOIL) {
      cargo[r] = Math.min(room, Math.floor(colony.stock[r] || 0));
      room -= cargo[r];
    }
    const fuel = Math.min(fleetTank(p.race, colony.ships), Math.floor(colony.stock.energy || 0));
    const res = launch(colony, { ships: colony.ships, cargo, fuel, at: { x: w.x, y: w.y }, origin: 'home', id: this.newId(6) }, now);
    if (res.error) return null;
    p.fleets.push(res.fleet);
    return res.fleet;
  }

  /** Une de mes planètes, pour un ordre ; sinon un message. */
  myPlanet(key) {
    const p = this.state.players[this.me];
    const found = this.planetOf(p, key);
    if (!found) this.ontoast?.('Planète introuvable.');
    return found;
  }

  build(key, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
    const pl = this.myPlanet(where);
    if (!pl) return;
    // Les places sont celles de la carte, pas celles de la fiche (qu'on pourrait effacer ou gonfler).
    // Une planète d'avant la place garde au moins ce qu'elle a déjà bâti.
    const w = this.planets.find((x) => sameCell(x, pl.cell));
    if (w?.places) pl.planet.places = Number.isFinite(pl.planet.places) ? w.places : Math.max(w.places, usedPlaces(pl.planet.levels));
    const err = startBuild(pl.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    const b = RACES[p.race].buildings[key];
    this.touch(this.addLog(`${p.name} lance ${b.name} niv. ${pl.planet.queue.level} sur ${pl.name}.`));
    this.changed();
  }

  /**
   * Ajoute un bâtiment au fil de construction de la planète (D-105) : il se
   * lancera tout seul, chantier libre, dès que le stock couvrira son prix.
   */
  planBuild(key, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    if (!p?.planet) return this.ontoast?.('Choisis d’abord ta race.');
    const pl = this.myPlanet(where);
    if (!pl) return;
    const R = RACES[p.race];
    if (!Object.hasOwn(R.buildings, key)) return this.ontoast?.('Bâtiment inconnu.');
    const w = this.planets.find((x) => sameCell(x, pl.cell));
    if (w?.places) pl.planet.places = Number.isFinite(pl.planet.places) ? w.places : Math.max(w.places, usedPlaces(pl.planet.levels));
    // On compte à partir de maintenant : sinon le fil partirait de l'heure du dernier calcul.
    for (const d of settle(pl.planet, this.now())) if (d.kind === 'start') this.addLog(`${p.name} lance ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name} (fil).`);
    const plan = pl.planet.plan || [];
    if (plan.length >= PLAN_MAX) return this.ontoast?.(`Le fil est plein (${PLAN_MAX} au plus).`);
    // Places : celles déjà prises, le chantier en cours et ce qui attend déjà dans le fil.
    const q = pl.planet.queue;
    const taken = usedPlaces(pl.planet.levels) + (q ? (q.demolish ? -1 : 1) : 0) + plan.length;
    if (Number.isFinite(pl.planet.places) && taken >= pl.planet.places) return this.ontoast?.(`Plus de place : les ${pl.planet.places} places de cette planète seront prises.`);
    pl.planet.plan = [...plan, key];
    this.touch(this.addLog(`${p.name} ajoute ${R.buildings[key].name} au fil de ${pl.name}.`));
    this.changed();
  }

  /**
   * Retire l'élément `index` du fil de construction, s'il s'agit bien de `key`
   * (le fil a pu avancer entre l'affichage et le toucher).
   */
  unplan(key, index, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    const pl = this.myPlanet(where);
    if (!pl) return;
    const R = RACES[p.race];
    for (const d of settle(pl.planet, this.now())) if (d.kind === 'start') this.addLog(`${p.name} lance ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name} (fil).`);
    const plan = pl.planet.plan || [];
    if (!Number.isInteger(index) || plan[index] !== key) return this.ontoast?.('Le fil a changé : déjà lancé ou retiré.');
    plan.splice(index, 1);
    pl.planet.plan = [...plan];
    this.touch(this.addLog(`${p.name} retire ${R.buildings[key].name} du fil de ${pl.name}.`));
    this.changed();
  }

  /** Déconstruit un niveau d'un bâtiment, pour libérer sa place. */
  demolish(key, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    const pl = this.myPlanet(where);
    if (!pl) return;
    const err = startDemolish(pl.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    const b = RACES[p.race].buildings[key];
    this.touch(this.addLog(`${p.name} déconstruit ${b.name} (niv. ${pl.planet.queue.level + 1} → ${pl.planet.queue.level}) sur ${pl.name}.`));
    this.changed();
  }

  /**
   * Recherche : sur n'importe laquelle de mes planètes qui a un labo, avec le niveau de ce labo.
   * Une recherche à la fois par planète, et pas la même technologie sur deux planètes à la fois.
   */
  research(key, where = 'home') {
    if (!this.canAct) return;
    const p = this.state.players[this.me];
    if (!p?.planet) return;
    const pl = this.myPlanet(where);
    if (!pl) return;
    const other = this.planetsOf(p).find((x) => x.key !== pl.key && x.planet.research?.key === key);
    if (other) return this.ontoast?.(`Cette technologie est déjà en recherche sur ${other.name}.`);
    // La copie des technologies d'une colonie peut avoir un passage de retard : on part des plus hautes.
    if (pl.key !== 'home' && Object.entries(p.planet.tech || {}).some(([k, n]) => n > (pl.planet.tech?.[k] || 0))) {
      settle(pl.planet, this.now());
      pl.planet.tech = maxTech(pl.planet.tech, techOf(p));
    }
    const err = startResearch(pl.planet, key, this.now());
    if (err) return this.ontoast?.(err);
    this.touch(this.addLog(`${p.name} lance la recherche ${TECHS[p.race][key].name} niv. ${pl.planet.research.level} sur ${pl.name}.`));
    this.changed();
  }

  /** Lot de vaisseaux au chantier naval d'une de mes planètes. */
  buildShips(type, count, where = 'home') {
    if (!this.canAct) return;
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
    const me0 = this.state.players[this.me];
    const out = [];
    if (here?.owner.id === this.me) out.push({ kind: 'dock', label: `Se poser sur ${here.name}` });
    else if (here) {
      out.push({ kind: 'attack', label: `Attaquer ${here.name} (${here.owner.name})` });
      const pl = this.planetOf(here.owner, here.key);
      const st = pl && stateAt(pl.planet, this.now());
      const fort = fortOf(here.owner.race, st?.levels, st?.pop);
      out.push({ kind: 'conquer', label: `Conquérir ${here.name} · défense ⚔ ${fort.attack} ◇ ${fort.hull}` });
    }
    else if (w && f.ships.colony && !me0.home) {
      if (!w.kind || w.kind === 'planet') out.push({ kind: 'colonize', label: `Fonder ta planète mère sur ${w.name}` });
    } else if (w && f.ships.colony) out.push({ kind: 'colonize', label: `Coloniser ${w.name}` });
    out.push({ kind: 'move', label: w || here ? 'Juste y aller (orbite)' : 'Y aller' });
    const me = this.state.players[this.me];
    const now = this.now();
    const short = fuelNeed(f, me.race, cell, now) > fuelAt(f, me.race, now) + 1e-9;
    return out.map((o) => ({ ...o, short }));
  }

  /** Faire décoller des vaisseaux (avec cargaison et carburant) d'une de mes planètes. */
  takeOff(fromKey, ships, cargo, fuel) {
    if (!this.canAct) return false;
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
    const res = launch(from.planet, { ships, cargo, fuel, at: from.cell, origin: fromKey, id: this.newId(6) }, this.now());
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
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    if (!f || this.locked(id)) return false;
    if (cell.x < 0 || cell.y < 0 || cell.x >= UNIVERSE.w || cell.y >= UNIVERSE.h) return false;
    const here = this.planetsAt(cell)[0];
    const w = this.planets.find((x) => sameCell(x, cell));
    let order = null;
    if (kind === 'dock') {
      if (here?.owner.id !== this.me) return this.refuse('Ce n’est pas une de tes planètes.');
      order = { kind, key: here.key };
    } else if (kind === 'attack' || kind === 'conquer') {
      if (!here || here.owner.id === this.me) return this.refuse('Aucune planète adverse ici.');
      if (!armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas attaquer.');
      order = { kind, pid: here.owner.id, key: here.key };
    } else if (kind === 'colonize') {
      if (!w || here) return this.refuse('Cette planète n’est pas libre.');
      if (!f.ships.colony) return this.refuse(`Il faut un vaisseau colonisateur (${SHIPS[p.race].colony.name}) pour coloniser.`);
      if (!p.home && w.kind && w.kind !== 'planet') return this.refuse(`${w.name} est trop petit pour une planète mère : vise une planète.`);
      order = { kind, world: w.id };
    }
    const err = moveTo(f, p.race, techOf(p), cell, order, this.now());
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
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    if (!f || this.locked(id)) return false;
    const err = stopAt(f, p.race, techOf(p), this.now());
    if (err) return this.refuse(err);
    this.touch();
    this.changed();
    return true;
  }

  /** Comportement en voyage d'une de mes flottes : 'passive' ou 'aggressive' (STANCES). */
  setFleetStance(id, stance) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    if (!f || !STANCES[stance]) return false;
    if (stance === 'aggressive' && !armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas être agressive.');
    if ((f.stance || 'passive') === stance) return false;
    f.stance = stance;
    this.tickLogs = []; // une flotte ennemie déjà au contact : le combat part avec ma fiche
    this.engage(p, f, this.now());
    const logs = this.tickLogs;
    this.tickLogs = null;
    this.touch(logs.length ? logs : null);
    this.changed();
    return true;
  }

  // ----- détection ---------------------------------------------------------

  /**
   * Ce que je vois : un disque autour de chacune de mes planètes et de mes
   * flottes, plus grand avec la technologie de détection. [{ x, y, r }]
   * La carte cache ce qui est hors de ces disques ; c'est un filtre
   * d'affichage, pas un secret : la copie de la partie, elle, contient tout.
   */
  eyes(now) {
    const me = this.state.players[this.me];
    if (!me?.race) return [];
    const tech = techOf(me);
    const out = this.planetsOf(me).map((pl) => ({ x: pl.cell.x, y: pl.cell.y, r: sightRange(me.race, tech, 'planet') }));
    for (const f of me.fleets || []) out.push({ ...fleetPos(f, now), r: sightRange(me.race, tech, 'fleet') });
    return out;
  }

  /** Une flotte est-elle visible de mon téléphone ? (les miennes, toujours) */
  sees(owner, f, now, eyes = this.eyes(now)) {
    if (owner?.id === this.me) return true;
    const pos = fleetPos(f, now);
    return eyes.some((e) => Math.hypot(pos.x - e.x, pos.y - e.y) <= e.r + 1e-9);
  }

  /** La flotte `id` d'un joueur, ou celle qui l'a absorbée en fusionnant. */
  fleetOf(p, id) {
    const all = p?.fleets || [];
    return all.find((f) => f.id === id) || all.find((f) => f.absorbed?.includes(id)) || null;
  }

  /** Lance une de mes flottes à la poursuite d'une flotte d'un autre joueur, pour la combattre. */
  chaseFleet(id, pid, targetId) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    const enemy = this.state.players[pid];
    const target = pid !== this.me && this.fleetOf(enemy, targetId);
    if (!f || !target) return this.refuse('Flotte introuvable.');
    if (this.locked(id)) return false;
    if (!this.sees(enemy, target, this.now())) return this.refuse('Cette flotte est hors de ta portée de détection.');
    if (!armed(p.race, f.ships, techOf(p))) return this.refuse('Cette flotte n’a pas d’armes : elle ne peut pas attaquer.');
    // Ma copie de sa flotte ne change qu'une fois mon rapport lu par son téléphone : d'ici là, ce
    // que je vois est l'état d'avant le combat, et rejouer le combat compterait les pertes deux fois.
    const pendingHit = (p.effects || []).some((e) => e.to === pid && [target.id, ...(target.absorbed || [])].includes(e.fleet) && !enemy.applied?.includes(e.id));
    if (pendingHit) return this.refuse(`Combat déjà livré : en attente du rapport de ${enemy.name}.`);
    f.order = { kind: 'chase', pid, fleet: target.id, seen: null };
    this.tickLogs = []; // un combat immédiat écrit au journal : ses entrées partent avec ma fiche
    this.pursue(p, f, this.now());
    if (f.order) this.addLog(`La flotte ${de(p.name)} prend en chasse une flotte ${de(enemy.name)}.`);
    const logs = this.tickLogs;
    this.tickLogs = null;
    this.touch(logs.length ? logs : null);
    this.changed();
    return true;
  }

  /**
   * Poursuite, à chaque passage : combat au contact ; sinon, nouveau cap
   * vers le point d'interception quand la cible a changé de trajet (ou
   * quand j'y suis arrivé sans la trouver). Renvoie true si ma fiche a changé.
   */
  pursue(p, f, now, from = now) {
    const enemy = this.state.players[f.order.pid];
    const target = this.fleetOf(enemy, f.order.fleet);
    // Rencontre que personne n'a regardée à temps (hors ligne) : combat à l'heure de la rencontre.
    const met = target && !inContact(f, target, now) && firstContact(f, target, from, now);
    if (met && this.sees(enemy, target, met) && !this.pendingFight(p, f, enemy, target)) {
      if (target.id !== f.order.fleet) f.order = { ...f.order, fleet: target.id };
      return this.fight(p, f, enemy, target, met);
    }
    if (!target || !this.sees(enemy, target, now)) {
      // Disparue (posée, détruite) ou sortie de ma portée de détection.
      f.order = null;
      this.addLog(`La flotte ${de(p.name)} perd sa cible de vue.`);
      this.ontoast?.('Cible perdue de vue : la poursuite s’arrête.');
      return true;
    }
    if (target.id !== f.order.fleet) f.order = { ...f.order, fleet: target.id }; // la cible a fusionné
    // Un combat entre ces deux flottes déjà livré (par une autre de mes flottes, ou par lui) et pas
    // encore lu : nos copies montrent l'état d'avant, le rejouer compterait les pertes deux fois.
    // J'attends son rapport, ou qu'il lise le mien.
    if (this.pendingFight(p, f, enemy, target)) return false;
    if (inContact(f, target, now)) return this.fight(p, f, enemy, target, now);
    // Appli en arrière-plan au moment de la rencontre : je regarde aussi l'instant de mon arrivée.
    if (!moving(f, now) && f.arrive > f.depart && inContact(f, target, f.arrive)) return this.fight(p, f, enemy, target, f.arrive);
    const seen = `${target.depart}:${target.arrive}:${target.to.x}:${target.to.y}`;
    if (seen === f.order.seen && moving(f, now)) return false;
    const aim = intercept(f, p.race, techOf(p), target, now);
    if (seen === f.order.seen && !moving(f, now) && Math.abs(aim.x - f.to.x) + Math.abs(aim.y - f.to.y) < 1e-6) return false; // j'attends au point d'interception
    const err = moveTo(f, p.race, techOf(p), aim, { ...f.order, seen }, now);
    if (err || f.stranded) {
      f.order = null;
      this.ontoast?.(err || 'Pas assez de carburant pour rattraper la cible : la poursuite s’arrête au point de panne.');
    }
    return true;
  }

  /**
   * Flotte agressive, à chaque passage : combat contre la flotte ennemie
   * visible la plus proche à son contact (la même règle que la poursuite),
   * puis la flotte reprend son trajet et son ordre. Renvoie true si ma fiche a changé.
   */
  engage(p, f, now, from = now) {
    if (!aggressive(f) || f.order?.kind === 'chase' || !armed(p.race, f.ships, techOf(p))) return false;
    const eyes = this.eyes(now);
    const pos = fleetPos(f, now);
    let best = null;
    let missed = null; // rencontre que personne n'a regardée à temps (hors ligne) : la plus ancienne
    for (const enemy of Object.values(this.state.players)) {
      if (enemy.id === this.me) continue;
      for (const target of enemy.fleets || []) {
        if (this.pendingFight(p, f, enemy, target)) continue;
        if (!inContact(f, target, now)) {
          const t = firstContact(f, target, from, now);
          if (t && (!missed || t < missed.t) && this.sees(enemy, target, t)) missed = { enemy, target, t };
          continue;
        }
        if (!this.sees(enemy, target, now, eyes)) continue;
        const t = fleetPos(target, now);
        const d = Math.hypot(t.x - pos.x, t.y - pos.y);
        if (!best || d < best.d) best = { enemy, target, d };
      }
    }
    if (best) return this.fight(p, f, best.enemy, best.target, now, true);
    return missed ? this.fight(p, f, missed.enemy, missed.target, missed.t, true) : false;
  }

  /** Un rapport de combat entre ma flotte `f` et sa flotte `target`, dans un sens ou dans l'autre, pas encore lu ? */
  pendingFight(p, f, enemy, target) {
    const ids = (x) => [x.id, ...(x.absorbed || [])];
    const theirs = ids(target);
    const mine = ids(f);
    return (
      (p.effects || []).some((e) => e.to === enemy.id && theirs.includes(e.fleet) && !enemy.applied?.includes(e.id)) ||
      (enemy.effects || []).some((e) => e.to === p.id && mine.includes(e.fleet) && !p.applied?.includes(e.id))
    );
  }

  /**
   * Combat entre ma flotte et celle d'un autre joueur, au contact. Je
   * calcule avec ce que je sais de la sienne ; son téléphone appliquera ses
   * pertes en lisant mon rapport (un identifiant neuf par combat).
   * `onward` : ma flotte (agressive) garde ensuite son trajet et son ordre.
   */
  fight(p, f, enemy, target, now, onward = false) {
    // Combat dans le passé : le prochain passage cherche les autres rencontres à partir de là.
    if (now < (this.scanAt ?? Infinity)) this.scanAt = now;
    const res = battle({ race: p.race, ships: f.ships, tech: techOf(p) }, { race: enemy.race, ships: target.ships, tech: enemy.planet?.tech || {} });
    const take = res.won ? salvage(p.race, res.attLeft, target.cargo, f.cargo) : {};
    // Lui aussi a pu livrer ce combat de son côté, sans avoir encore lu mon rapport (poursuite
    // mutuelle) : c'est le même combat, chacun ne compte alors ses pertes qu'une fois. `sim` dit
    // que je n'avais pas encore lu son rapport sur ce combat, `engaged` garde trace de mes combats.
    // `ack` : ses rapports sur nos deux flottes que j'avais déjà lus. Un de ses combats absent de
    // cette liste, il l'a livré sans que je le sache : le même combat que le mien.
    const mine = [f.id, ...(f.absorbed || [])];
    const theirs = [target.id, ...(target.absorbed || [])];
    const ack = (p.engaged || []).filter((g) => g.got && theirs.includes(g.fleet) && mine.includes(g.by)).map((g) => g.got);
    const id = this.newId(8);
    p.engaged = [...(p.engaged || []), { fleet: target.id, by: f.id, at: now, id }].slice(-20);
    // `lost` : mes pertes, pour son rapport de combat (il ne les connaît pas autrement).
    p.effects = [...(p.effects || []), { id, to: enemy.id, fleet: target.id, by: f.id, sim: true, ack, at: now, ships: res.defLost, lost: res.attLost, take }].slice(-MAX_EFFECTS);
    const loot = lootText(take);
    const wiped = !countShips(res.attLeft);
    this.note(p, {
      at: now, kind: 'combat', who: enemy.name, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot,
      tone: res.won ? 'good' : wiped ? 'bad' : 'even',
      text: res.won ? `Ta flotte détruit une flotte ${de(enemy.name)}.` : wiped ? `Ta flotte est détruite par ${enemy.name}.` : `Combat de flottes indécis contre ${enemy.name}.`,
    });
    this.addLog(
      res.won
        ? `${p.name} détruit une flotte ${de(enemy.name)}${loot ? ` et récupère ${loot}` : ''}.`
        : countShips(res.attLeft)
          ? `Combat indécis entre ${p.name} et ${enemy.name}.`
          : `${p.name} perd une flotte contre ${enemy.name}.`,
    );
    this.ontoast?.(res.won ? 'Flotte ennemie détruite !' : countShips(res.attLeft) ? 'Combat indécis.' : 'Flotte perdue.');
    if (!onward) f.order = null;
    if (!applyLosses(f, p.race, techOf(p), res.attLost, null, now)) {
      p.fleets = p.fleets.filter((x) => x.id !== f.id);
      return true;
    }
    if (!onward && moving(f, now)) stopAt(f, p.race, techOf(p), now);
    f.cargo = Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + (take[r] || 0)]));
    return true;
  }

  // ----- échanges entre joueurs ---------------------------------------------

  /** Une de mes flottes attend la réponse à un échange : elle ne bouge pas (message, et true). */
  locked(id) {
    const busy = (this.state.players[this.me]?.offers || []).some((o) => o.from.fleet === id);
    if (busy) this.ontoast?.('Cette flotte attend la réponse à un échange : elle ne peut rien faire d’autre d’ici là.');
    return busy;
  }

  /**
   * Partie d'un échange chez le joueur `p` : `ref` = { fleet: id } (arrêtée)
   * ou { planet: key }. { side, cell, name } ou null.
   */
  tradeSide(p, ref, now) {
    if (!p) return null;
    if (ref?.fleet) {
      const f = this.fleetOf(p, ref.fleet);
      if (!f || moving(f, now)) return null;
      return { side: { fleet: f }, cell: parkedCell(f), name: `une flotte ${de(p.name)}` };
    }
    const pl = ref?.planet && this.planetOf(p, ref.planet);
    if (!pl || this.ownerAt(pl.cell)?.id !== p.id) return null;
    return { side: { planet: pl.planet }, cell: pl.cell, name: `${pl.name} (${p.name})` };
  }

  /**
   * Avec qui échanger depuis `fromRef` (une de mes flottes ou planètes) :
   * les flottes arrêtées et la planète des autres joueurs sur la même case.
   * [{ pid, ref, name }]
   */
  tradePartners(fromRef) {
    const now = this.now();
    const mine = this.tradeSide(this.state.players[this.me], fromRef, now);
    if (!mine) return [];
    const out = [];
    for (const p of Object.values(this.state.players)) {
      if (p.id === this.me) continue;
      for (const f of p.fleets || []) {
        if (moving(f, now) || !sameCell(parkedCell(f), mine.cell) || !this.sees(p, f, now)) continue;
        out.push({ pid: p.id, ref: { fleet: f.id }, name: `Flotte ${de(p.name)}` });
      }
      if (mine.side.fleet) {
        const pl = this.planetsOf(p).find((x) => sameCell(x.cell, mine.cell) && this.ownerAt(x.cell)?.id === p.id);
        if (pl) out.push({ pid: p.id, ref: { planet: pl.key }, name: `${pl.name} (${p.name})` });
      }
    }
    return out;
  }

  /** Ce que possède une partie, vu de mon téléphone (pour remplir la fenêtre d'échange). */
  tradeHoldings(pid, ref) {
    const p = this.state.players[pid];
    const now = this.now();
    const s = this.tradeSide(p, ref, now);
    if (!s) return null;
    if (s.side.planet) {
      const st = stateAt(s.side.planet, now).stock;
      return { minerals: Math.floor(st.minerals || 0), food: Math.floor(st.food || 0), fuel: Math.floor(st.energy || 0) };
    }
    return holdings(s.side, p.race, now);
  }

  /**
   * Propose un échange : ce que je donne part sous séquestre tout de suite,
   * l'offre vaut OFFER_MS et ne s'annule pas. La flotte qui propose est
   * bloquée jusqu'à la réponse.
   */
  proposeTrade(fromRef, toRef, giveIn, wantIn) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const other = this.state.players[toRef?.pid];
    const now = this.now();
    const give = amounts(giveIn);
    const want = amounts(wantIn);
    if (!other || other.id === this.me) return this.refuse('Joueur introuvable.');
    if (isEmpty(give) && isEmpty(want)) return this.refuse('Choisis ce que tu donnes ou ce que tu demandes.');
    if (fromRef.fleet && this.locked(fromRef.fleet)) return false;
    if ((p.offers || []).length >= MAX_OFFERS) return this.refuse(`Pas plus de ${MAX_OFFERS} échanges en attente.`);
    const mine = this.tradeSide(p, fromRef, now);
    const theirs = this.tradeSide(other, toRef, now);
    if (!mine || !theirs || !sameCell(mine.cell, theirs.cell)) return this.refuse('Les deux parties doivent être arrêtées sur la même case.');
    const err = lacks(mine.side, p.race, give, now) || noRoom(mine.side, p.race, want, now, give);
    if (err) return this.refuse(err);
    take(mine.side, p.race, give, now);
    const offer = { id: this.newId(8), from: fromRef, to: toRef, give, want, at: now, expires: now + OFFER_MS };
    p.offers = [...(p.offers || []), offer];
    this.touch(this.addLog(`${p.name} propose un échange à ${other.name}.`));
    this.changed();
    return offer.id;
  }

  /** Offres des autres qui m'attendent : [{ from: joueur, offer }]. */
  incomingOffers() {
    const me = this.state.players[this.me];
    const now = this.now();
    const out = [];
    for (const p of Object.values(this.state.players)) {
      if (p.id === this.me) continue;
      for (const o of p.offers || []) {
        if (o.to.pid !== this.me || now >= o.expires) continue;
        if ((me.answers || []).some((a) => a.offer === o.id && a.pid === p.id)) continue;
        out.push({ from: p, offer: o });
      }
    }
    return out;
  }

  /**
   * Réponse à une offre. Accepter : je donne ce qu'on me demande et je
   * reçois ce qu'on m'offre, tout de suite (l'autre a déjà mis sa part sous
   * séquestre). Mon téléphone vérifie l'expiration, la case et les places.
   */
  answerTrade(pid, offerId, ok) {
    if (!this.canAct) return false;
    const me = this.state.players[this.me];
    const other = this.state.players[pid];
    const offer = other?.offers?.find((o) => o.id === offerId);
    const now = this.now();
    if (!offer || offer.to.pid !== this.me) return this.refuse('Offre introuvable.');
    if ((me.answers || []).some((a) => a.offer === offerId && a.pid === pid)) return this.refuse('Déjà répondu.');
    if (ok && offer.to.fleet && this.locked(offer.to.fleet)) return false; // ses soutes sont réservées à son propre échange
    if (ok) {
      if (now >= offer.expires) return this.refuse('Offre expirée.');
      const mine = this.tradeSide(me, offer.to, now);
      const theirs = this.tradeSide(other, offer.from, now);
      if (!mine || !theirs || !sameCell(mine.cell, theirs.cell)) return this.refuse('Les deux parties doivent être arrêtées sur la même case.');
      const want = amounts(offer.want);
      const give = amounts(offer.give);
      const err = lacks(mine.side, me.race, want, now) || noRoom(mine.side, me.race, give, now, want);
      if (err) return this.refuse(err);
      take(mine.side, me.race, want, now);
      put(mine.side, me.race, give, now);
    }
    me.answers = this.keptAnswers([...(me.answers || []), { offer: offerId, pid, ok: !!ok, at: now }]);
    this.touch(this.addLog(`${me.name} ${ok ? 'accepte' : 'refuse'} l’échange ${de(other.name)}.`));
    this.changed();
    return true;
  }

  /**
   * Mes offres : l'autre a répondu (ou l'offre a expiré) → je reçois ce que
   * j'ai demandé, ou mon séquestre me revient. Renvoie true si ma fiche a changé.
   */
  settleOffers(p, now) {
    let any = false;
    for (const o of [...(p.offers || [])]) {
      const other = this.state.players[o.to.pid];
      const answer = other?.answers?.find((a) => a.offer === o.id && a.pid === this.me) || null;
      const end = outcome(o, answer, now, other?.actAt || 0);
      if (!end) continue;
      any = true;
      p.offers = p.offers.filter((x) => x.id !== o.id);
      // Ma partie : la flotte (ou celle qui l'a absorbée), sinon la planète où elle s'est posée.
      let mine = this.tradeSide(p, o.from, now) || (o.from.fleet && this.tradeSide(p, { planet: p.docked?.[o.from.fleet] }, now));
      if (!mine && o.from.fleet) {
        const f = this.fleetOf(p, o.from.fleet);
        if (f) mine = { side: { fleet: f } };
      }
      // Flotte détruite : le séquestre est perdu avec elle, mais ce que l'autre a payé arrive chez moi.
      if (!mine && end === 'accepted') mine = this.tradeSide(p, { planet: 'home' }, now);
      if (!mine) continue;
      put(mine.side, p.race, end === 'accepted' ? amounts(o.want) : amounts(o.give), now);
      // Rendu faute de nouvelles : sa réponse peut encore arriver, datée d'avant l'expiration.
      if (end === 'returned' && !answer) p.dropped = [...(p.dropped || []), { id: o.id, pid: o.to.pid, give: o.give, want: o.want, expires: o.expires, at: now }].slice(-20);
      const who = other?.name || 'l’autre joueur';
      this.addLog(end === 'accepted' ? `Échange conclu entre ${p.name} et ${who}.` : `Échange avec ${who} sans suite : ${p.name} récupère sa part.`);
      this.ontoast?.(end === 'accepted' ? `${who} a accepté ton échange.` : answer ? `${who} a refusé ton échange.` : `Ton échange avec ${who} a expiré.`);
    }
    if (this.settleDropped(p, now)) any = true;
    return any;
  }

  /**
   * Offres que j'ai reprises sans réponse (l'autre ne donnait plus de
   * nouvelles) : s'il avait accepté à temps, je lui dois ce qu'il a payé et
   * il a déjà reçu ma part. Je reprends donc ce que j'ai récupéré (ce qu'il
   * en reste sur ma planète mère) et je reçois ce que j'avais demandé.
   */
  settleDropped(p, now) {
    let any = false;
    for (const d of [...(p.dropped || [])]) {
      const other = this.state.players[d.pid];
      const answer = other?.answers?.find((a) => a.offer === d.id && a.pid === this.me);
      const silent = !answer && (!other || (other.actAt || 0) > d.at + GRACE_MS || now > d.at + 7 * 86_400_000);
      if (!answer && !silent) continue;
      p.dropped = p.dropped.filter((x) => x !== d);
      any = true;
      if (!answer?.ok || answer.at > d.expires) continue;
      const home = this.tradeSide(p, { planet: 'home' }, now);
      if (!home) continue;
      const have = holdings(home.side, p.race, now);
      const give = Object.fromEntries(Object.entries(amounts(d.give)).map(([r, v]) => [r, Math.min(v, have[r] || 0)]));
      take(home.side, p.race, give, now);
      put(home.side, p.race, amounts(d.want), now);
      this.addLog(`Échange conclu en retard entre ${p.name} et ${other.name}.`);
    }
    return any;
  }

  /**
   * Mes réponses à garder : tant que l'offre existe chez celui qui propose,
   * il en a besoin pour la régler (l'oublier la ferait accepter deux fois, ou
   * rendre son séquestre en plus). Une fois qu'il l'a réglée, elle peut partir.
   */
  keptAnswers(answers) {
    const live = (a) => {
      const other = this.state.players[a.pid];
      return other?.offers?.some((o) => o.id === a.offer) || other?.dropped?.some((d) => d.id === a.offer);
    };
    return answers.filter(live).slice(-200);
  }

  /**
   * Offres pour moi expirées sans réponse : je les refuse, pour que celui
   * qui propose récupère sa part dès qu'il reçoit ma fiche.
   */
  refuseExpired(p, now) {
    let any = false;
    for (const other of Object.values(this.state.players)) {
      if (other.id === this.me) continue;
      for (const o of other.offers || []) {
        if (o.to.pid !== this.me || now < o.expires) continue;
        if ((p.answers || []).some((a) => a.offer === o.id && a.pid === other.id)) continue;
        p.answers = this.keptAnswers([...(p.answers || []), { offer: o.id, pid: other.id, ok: false, at: now }]);
        any = true;
      }
    }
    return any;
  }

  /** Nouvelle offre pour moi : un message, une fois. */
  noticeOffers(now) {
    this.seenOffers ||= new Set();
    for (const { from, offer } of this.incomingOffers()) {
      if (this.seenOffers.has(offer.id)) continue;
      this.seenOffers.add(offer.id);
      if (now < offer.expires) this.ontoast?.(`${from.name} te propose un échange (carte).`);
    }
  }

  /** Plein d'une de mes flottes, arrêtée sur une de mes planètes, avec l'énergie de celle-ci. */
  refuelFleet(id) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    const now = this.now();
    if (!f || moving(f, now)) return this.refuse('La flotte doit être arrêtée pour faire le plein.');
    if (this.locked(id)) return false; // son réservoir doit garder la place du carburant échangé
    const here = this.planetsAt(parkedCell(f))[0]; // en panne tout près : elle est en orbite
    const pl = here?.owner.id === this.me && this.planetOf(p, here.key);
    if (!pl) return this.refuse('Le plein se fait en orbite d’une de tes planètes.');
    const give = refuel(pl.planet, f, p.race, now);
    if (!give) return this.refuse('Pas d’énergie à verser, ou réservoirs déjà pleins.');
    this.ontoast?.(`Plein : ${give} d’énergie.`);
    this.touch();
    this.changed();
    return true;
  }

  /** Mes autres flottes arrêtées sur la même case que celle-ci. */
  fleetsBeside(id) {
    const f = this.myFleet(id);
    const now = this.now();
    if (!f) return [];
    return (this.state.players[this.me].fleets || []).filter((g) => g.id !== id && together(f, g, now));
  }

  /** Deux de mes flottes arrêtées ensemble, pour une opération entre elles ; sinon un message. */
  pairOf(fromId, toId) {
    const a = this.myFleet(fromId);
    const b = this.myFleet(toId);
    if (!a || !b || a === b) return this.refuse('Flotte introuvable.');
    if (this.locked(fromId) || this.locked(toId)) return false;
    if (!together(a, b, this.now())) return this.refuse('Les deux flottes doivent être arrêtées sur la même case.');
    return [a, b];
  }

  /** Fait passer vaisseaux, cargaison et carburant d'une de mes flottes à une autre. */
  transferFleet(fromId, toId, part) {
    if (!this.canAct) return false;
    const pair = this.pairOf(fromId, toId);
    if (!pair) return false;
    const err = transfer(pair[0], pair[1], this.state.players[this.me].race, part, this.now());
    if (err) return this.refuse(err);
    this.touch();
    this.changed();
    return true;
  }

  /** Fusionne une de mes flottes dans une autre, sur la même case. */
  mergeFleets(fromId, intoId) {
    if (!this.canAct) return false;
    const pair = this.pairOf(fromId, intoId);
    if (!pair) return false;
    const p = this.state.players[this.me];
    merge(pair[0], pair[1], p.race, this.now());
    p.fleets = p.fleets.filter((f) => f.id !== fromId);
    this.touch();
    this.changed();
    return true;
  }

  /** Scinde une de mes flottes arrêtées : `part` forme une nouvelle flotte, au même endroit. */
  splitFleet(id, part) {
    if (!this.canAct) return false;
    const p = this.state.players[this.me];
    const f = this.myFleet(id);
    const now = this.now();
    if (!f || this.locked(id)) return false;
    if (moving(f, now)) return this.refuse('La flotte doit être arrêtée pour se scinder.');
    if (p.fleets.length >= MAX_FLEETS) return this.refuse(`Pas plus de ${MAX_FLEETS} flottes.`);
    const res = split(f, p.race, part, this.newId(6), now);
    if (res.error) return this.refuse(res.error);
    p.fleets.push(res.fleet);
    this.touch();
    this.changed();
    return res.fleet.id;
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
    if (!this.canAct) return;
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
  /**
   * `from` : depuis quand chercher les rencontres de flottes que personne n'a
   * regardées (téléphones hors ligne, en arrière-plan) : le passage précédent
   * (`scanAt`), ou au lancement la dernière modification de ma fiche. Notée
   * dans le journal d'ordres : le rejeu cherche sur la même fenêtre.
   */
  tick() {
    if (this.status !== 'playing' || !this.state) return;
    this.checkClaim();
    const p = this.state.players[this.me];
    if (!p?.race) return;
    const now = this.now();
    const entered = this.enterRace(p, now); // départ donné : ma flotte de départ apparaît
    const racing = Number.isFinite(p.ready) && Number.isFinite(p.since) && !p.out; // dans la course, peut-être sans planète
    if (!p.planet && !p.fleets?.length && !racing) return;
    const from = Math.min(now, this.scanAt ?? p.actAt ?? now);
    if (this.entry && from < now) this.entry.from = from;
    this.scanAt = now;
    let changed = entered;
    this.tickLogs = []; // entrées du journal de ce passage, envoyées avec ma fiche
    if (this.over) {
      // Partie finie : tout s'arrête, sauf la lecture des derniers combats.
      if (this.applyEffects(p, now)) this.touch(this.tickLogs.length ? this.tickLogs : null), this.changed();
      this.tickLogs = null;
      return;
    }
    if (this.freeze(p, now)) changed = true;
    let techAt = now; // fin de la dernière recherche terminée depuis le passage précédent
    let colonyTech = false; // une colonie a trouvé une technologie : les autres planètes la reçoivent
    const R = RACES[p.race];
    const report = (pl, d) => {
      changed = true;
      if (d.kind === 'start') this.addLog(`${p.name} lance ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name} (fil).`);
      else if (d.kind === 'queue' && d.demolish) this.addLog(`${p.name} a déconstruit ${R.buildings[d.key].name} (niv. ${d.level}) sur ${pl.name}.`);
      else if (d.kind === 'queue') this.addLog(`${p.name} termine ${R.buildings[d.key].name} niv. ${d.level} sur ${pl.name}.`);
      else if (d.kind === 'research') {
        techAt = Math.min(techAt, d.end);
        // Trouvée dans une colonie : elle vaut aussi pour la planète mère, qui la donne aux autres.
        if (pl.key !== 'home') {
          settle(p.planet, d.end); // la planète mère profite du bonus à partir de la fin, pas avant
          p.planet.tech = maxTech(techOf(p), { [d.key]: d.level });
          colonyTech = true;
        }
        this.addLog(`${p.name} découvre ${TECHS[p.race][d.key].name} niv. ${d.level} sur ${pl.name}.`);
        this.ontoast?.(`Recherche terminée : ${TECHS[p.race][d.key].name} niv. ${d.level}.`);
      } else this.addLog(`${p.name} reçoit ${d.count} × ${SHIPS[p.race][d.type].name} sur ${pl.name}.`);
    };
    // Les technologies valent pour toutes mes planètes : chaque colonie en garde une copie, à
    // partir de la fin de la recherche (et pas seulement du passage qui s'en aperçoit).
    const shareTech = (pl) => {
      if (pl.key === 'home' || sameTech(pl.planet.tech, techOf(p))) return;
      for (const d of settle(pl.planet, Math.min(techAt, now))) report(pl, d);
      p.planet.tech = maxTech(techOf(p), pl.planet.tech); // une recherche finie ici et pas encore partagée
      pl.planet.tech = { ...p.planet.tech };
      changed = true;
    };
    // La planète mère d'abord (planetsOf la donne en premier) : ses recherches valent pour les colonies.
    const mine = this.planetsOf(p);
    for (const pl of mine) {
      shareTech(pl);
      // Une fin de chantier, ou le fil de construction qui peut lancer le suivant.
      const due = ['queue', 'research', 'yard'].some((k) => pl.planet[k] && pl.planet[k].end <= now) || (!pl.planet.queue && pl.planet.plan?.length && stateAt(pl.planet, now).done.length > 0);
      if (due) for (const d of settle(pl.planet, now)) report(pl, d);
    }
    // Une recherche finie dans une colonie : les planètes déjà passées la reçoivent aussi.
    if (colonyTech) for (const pl of mine) shareTech(pl);
    // Les combats des autres d'abord : mes flottes agissent ensuite avec leurs vraies pertes.
    if (this.applyEffects(p, now)) changed = true;
    for (const f of [...(p.fleets || [])]) {
      if (f.order?.kind === 'chase') {
        if (this.pursue(p, f, now, from)) changed = true;
        continue;
      }
      if (this.engage(p, f, now, from)) changed = true;
      if (!p.fleets.includes(f)) continue; // détruite dans ce combat
      if (f.order && !moving(f, now) && this.arrive(p, f)) changed = true;
    }
    if (this.noColonizer(p, now)) changed = true;
    if (this.settleOffers(p, now)) changed = true;
    if (this.refuseExpired(p, now)) changed = true;
    this.noticeOffers(now);
    if (this.checkOver(p, now)) changed = true;
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
      const docked = { ...(p.docked || {}) };
      for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = pl.key;
      p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
      drop();
      const loot = lootText(f.cargo || {});
      this.addLog(`La flotte ${de(p.name)} se pose sur ${pl.name}${loot ? ` avec ${loot}` : ''}.`);
      return true;
    }

    if (order.kind === 'colonize' && !p.home && !p.out) return this.found(p, f, order);

    if (order.kind === 'colonize') {
      const w = this.planets.find((x) => x.id === order.world);
      // Prise par un joueur arrivé après moi (son téléphone est passé avant le mien) : je
      // fonde quand même, et son téléphone lui rendra sa flotte (checkClaim).
      if (!w || !f.ships.colony || this.takenBefore(w, f.arrive)) {
        this.addLog(`${w?.name || 'La planète'} est déjà prise : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      if (this.frostOf(w) <= f.arrive) {
        this.addLog(`${w.name} est gelée : la flotte ${de(p.name)} reste en orbite.`);
        return true;
      }
      const colony = newPlanet(p.race, f.arrive, w);
      colony.stock = { minerals: 0, food: 0, ...f.cargo, energy: Math.floor(fuelAt(f, p.race, now)) };
      colony.tech = { ...techOf(p) };
      colony.claimAt = f.arrive;
      const ships = { ...f.ships, colony: f.ships.colony - 1 };
      if (!ships.colony) delete ships.colony;
      colony.ships = ships;
      p.colonies = { ...(p.colonies || {}), [w.id]: colony };
      // Un combat contre cette flotte que je n'ai pas encore lu retombera sur la colonie.
      const docked = { ...(p.docked || {}) };
      for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = w.id;
      p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
      drop();
      this.addLog(`${p.name} fonde une colonie sur ${w.name}.`);
      this.ontoast?.(`Colonie fondée sur ${w.name} !`);
      return true;
    }

    if (order.kind === 'attack' || order.kind === 'conquer') {
      const enemy = this.state.players[order.pid];
      const pl = enemy && this.planetOf(enemy, order.key);
      if (!pl || !sameCell(pl.cell, f.to)) return true;
      // Je calcule le combat avec ce que je sais du défenseur à l'heure de l'arrivée ;
      // son téléphone appliquera ses pertes en lisant mon rapport.
      const def = this.defenseAt(p, enemy, pl, f.arrive);
      // La planète se défend avec ses vaisseaux posés et sa défense (ses bâtiments : canons, boucliers…).
      const fort = fortOf(enemy.race, def.levels, def.pop);
      const res = battle({ race: p.race, ships: f.ships, tech: techOf(p) }, { race: enemy.race, ships: def.ships, tech: def.tech, fort });
      if (!res.won) this.addLog(`La défense de ${pl.name} (${enemy.name}) repousse ${de(p.name)}.`);
      // Un pillage par planète toutes les 2 min au plus : sinon, des attaques à la chaîne depuis
      // l'orbite (trajet de 0 case) vidaient tout, malgré la règle « la moitié au plus ».
      const spot = `${enemy.id}:${pl.key}`;
      const recent = (p.raided?.[spot] || 0) > f.arrive - RAID_COOLDOWN_MS;
      const take = res.won && !recent ? plunder(p.race, res.attLeft, def.stock, f.cargo) : {};
      if (res.won && !recent) p.raided = Object.fromEntries([...Object.entries(p.raided || {}).filter(([, t]) => t > f.arrive - RAID_COOLDOWN_MS), [spot, f.arrive]]);
      // Conquête : vaisseaux et défense abattus, sur une planète que le froid n'a pas prise, elle change de main.
      const w = this.planets.find((x) => sameCell(x, pl.cell));
      const capture = order.kind === 'conquer' && res.won && !!w && this.frostOf(w) > f.arrive;
      // Un identifiant par combat : une même flotte peut attaquer plusieurs fois.
      const effect = { id: this.newId(8), to: enemy.id, key: pl.key, at: f.arrive, ships: res.defLost, lost: res.attLost, take };
      if (capture) Object.assign(effect, { capture: true, cell: { ...pl.cell } });
      p.effects = [...(p.effects || []), effect].slice(-MAX_EFFECTS);
      if (capture) return this.capture(p, f, w, pl, enemy, res, take, now);
      const loot = lootText(take);
      this.addLog(
        res.won
          ? `${p.name} remporte le combat sur ${pl.name} (${enemy.name})${loot ? ` et pille ${loot}` : ''}.`
          : `${p.name} perd le combat sur ${pl.name} (${enemy.name}).`,
      );
      this.ontoast?.(res.won ? `Victoire sur ${pl.name} !` : `Défaite sur ${pl.name}.`);
      this.note(p, {
        at: f.arrive, kind: 'combat', who: enemy.name, planet: pl.name, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot,
        tone: res.won ? 'good' : 'bad',
        text: res.won ? `Victoire sur ${pl.name} (${enemy.name}).` : `Défaite sur ${pl.name} (${enemy.name}) : sa défense te repousse.`,
      });
      // Les soutes perdues emportent leur cargaison, comme en combat entre flottes.
      if (!applyLosses(f, p.race, techOf(p), res.attLost, null, now)) return drop(), true;
      f.cargo =Object.fromEntries(SOIL.map((r) => [r, (f.cargo?.[r] || 0) + (take[r] || 0)]));
      return true;
    }
    return true;
  }

  /**
   * Mon colonisateur arrive et je n'ai pas encore de planète : il fonde ma planète mère, avec les
   * bâtiments et le stock de départ de ma race (comme l'installation d'avant). Le colonisateur
   * est consommé, les autres vaisseaux s'y posent, la cargaison rejoint le stock ; le carburant
   * restant est perdu (même départ pour tous, quelle que soit la longueur du trajet).
   */
  found(p, f, order) {
    const w = this.planets.find((x) => x.id === order.world);
    if (!w || !f.ships.colony || this.takenBefore(w, f.arrive)) {
      this.addLog(`${w?.name || 'La planète'} est déjà prise : la flotte ${de(p.name)} reste en orbite.`);
      this.ontoast?.(`${w?.name || 'La planète'} est déjà prise : choisis-en une autre.`);
      return true;
    }
    if (w.kind && w.kind !== 'planet') {
      this.addLog(`${w.name} est trop petit pour une planète mère : la flotte ${de(p.name)} reste en orbite.`);
      return true;
    }
    if (this.frostOf(w) <= f.arrive) {
      this.addLog(`${w.name} est gelée : la flotte ${de(p.name)} reste en orbite.`);
      return true;
    }
    const planet = newPlanet(p.race, f.arrive, w);
    const ships = { ...f.ships, colony: f.ships.colony - 1 };
    if (!ships.colony) delete ships.colony;
    planet.ships = ships;
    for (const r of SOIL) planet.stock[r] = (planet.stock[r] || 0) + (f.cargo?.[r] || 0);
    p.home = { x: w.x, y: w.y };
    p.claimAt = f.arrive;
    p.since ??= f.arrive;
    p.planet = planet;
    const docked = { ...(p.docked || {}) };
    for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = 'home';
    p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
    p.fleets = p.fleets.filter((x) => x.id !== f.id);
    this.addLog(`${p.name} fonde sa planète mère sur ${w.name}.`);
    this.ontoast?.(`Planète mère fondée sur ${w.name} !`);
    return true;
  }

  /**
   * Ma flotte vient de prendre la planète `pl` de `enemy` : ses bâtiments
   * sont tombés avec sa défense, elle devient ma colonie (à rebâtir pour ma
   * race), avec ce qui reste de la flotte, sa cargaison et le butin. Son téléphone la retirera de sa fiche en
   * lisant mon rapport.
   */
  capture(p, f, w, pl, enemy, res, take, now) {
    const colony = newPlanet(p.race, f.arrive, w);
    colony.stock = { minerals: 0, food: 0 };
    for (const r of SOIL) colony.stock[r] = (f.cargo?.[r] || 0) + (take[r] || 0);
    colony.stock.energy = Math.floor(fuelAt(f, p.race, now));
    colony.tech = { ...techOf(p) };
    colony.claimAt = f.arrive;
    colony.ships = { ...res.attLeft };
    p.colonies = { ...(p.colonies || {}), [w.id]: colony };
    const docked = { ...(p.docked || {}) };
    for (const id of [f.id, ...(f.absorbed || [])]) docked[id] = w.id;
    p.docked = Object.fromEntries(Object.entries(docked).slice(-60));
    p.fleets = p.fleets.filter((x) => x.id !== f.id);
    this.addLog(`${p.name} prend ${pl.name} à ${enemy.name} !`);
    this.ontoast?.(`${pl.name} est à toi !`);
    this.note(p, {
      at: f.arrive, kind: 'combat', who: enemy.name, planet: pl.name, capture: true, mine: countShips(res.attLost), theirs: countShips(res.defLost), loot: lootText(take),
      tone: 'good', text: `Tu prends ${pl.name} à ${enemy.name}.`,
    });
    return true;
  }

  /**
   * Planète d'un autre joueur telle que je la vois à `at`, moins mes
   * combats que son téléphone n'a pas encore lus : sa fiche ne montre ces
   * pertes et ces pillages qu'après, et les ignorer ferait piller le même
   * stock et tuer les mêmes vaisseaux plusieurs fois.
   */
  defenseAt(p, enemy, pl, at) {
    const def = stateAt(pl.planet, at);
    const ships = { ...def.ships };
    const stock = { ...def.stock };
    // Les combats des autres joueurs contre elle, que je vois et qu'elle n'a pas encore lus, aussi.
    const reports = Object.values(this.state.players).flatMap((o) => (o.id === enemy.id ? [] : o.effects || []));
    for (const e of reports) {
      if (e.to !== enemy.id || e.key !== pl.key || enemy.applied?.includes(e.id)) continue;
      for (const [k, n] of Object.entries(e.ships || {})) ships[k] = Math.max(0, (ships[k] || 0) - n);
      for (const [r, v] of Object.entries(e.take || {})) stock[r] = Math.max(0, (stock[r] || 0) - v);
    }
    return { ...def, ships, stock };
  }

  /**
   * Dégâts qu'un autre joueur m'a infligés : il les a inscrits dans sa
   * fiche (je suis le seul à écrire la mienne), je les applique une fois.
   */
  applyEffects(p, now) {
    p.applied ||= [];
    let any = false;
    // Mes rapports déjà appliqués par leur cible : je peux les oublier.
    const pending = (p.effects || []).filter((e) => !this.state.players[e.to]?.applied?.includes(e.id));
    if (pending.length !== (p.effects || []).length) {
      p.effects = pending;
      any = true;
    }
    const live = new Set();
    for (const other of Object.values(this.state.players)) {
      if (other.id === this.me) continue;
      for (const e of other.effects || []) {
        if (e.to !== this.me) continue;
        live.add(e.id);
        if (p.applied.includes(e.id)) continue;
        p.applied = [...p.applied, e.id];
        any = true;
        if (e.fleet && this.fleetHit(p, other, e, now)) continue;
        // Une prise vise une case : ma planète mère a pu changer depuis (la clé « home » ne suffit pas).
        const pl = e.capture
          ? this.planetsOf(p).find((x) => sameCell(x.cell, e.cell))
          : this.planetOf(p, e.fleet ? p.docked?.[e.fleet] : e.key); // flotte posée entre-temps : sa planète encaisse
        if (!pl) continue;
        if (e.capture) {
          this.note(p, {
            at: e.at, kind: 'combat', who: other.name, planet: pl.name, capture: true, mine: countShips(e.ships), theirs: e.lost ? countShips(e.lost) : null,
            pillaged: lootText(e.take || {}), tone: 'bad', text: `${other.name} prend ${pl.name}.`,
          });
          this.losePlanet(p, pl.key, e.at, `prise par ${other.name}`);
          continue;
        }
        settle(pl.planet, now);
        pl.planet.ships ||= {};
        for (const [k, n] of Object.entries(e.ships || {})) pl.planet.ships[k] = Math.max(0, (pl.planet.ships[k] || 0) - n);
        for (const [r, v] of Object.entries(e.take || {})) pl.planet.stock[r] = Math.max(0, (pl.planet.stock[r] || 0) - v);
        const lost = countShips(e.ships);
        const loot = lootText(e.take || {});
        const ships = lost ? `${lost} vaisseau${lost > 1 ? 'x' : ''} perdu${lost > 1 ? 's' : ''}` : 'aucun vaisseau perdu';
        this.addLog(`${pl.name} (${p.name}) est attaquée par ${other.name} : ${ships}${loot ? `, ${loot} pillés` : ''}.`);
        this.ontoast?.(`${other.name} attaque ${pl.name} !`);
        const harm = lost > 0 || !!loot;
        this.note(p, {
          at: e.at, kind: 'combat', who: other.name, planet: pl.name, mine: lost, theirs: e.lost ? countShips(e.lost) : null, pillaged: loot,
          tone: harm ? 'bad' : 'good', text: harm ? `${other.name} attaque ${pl.name}.` : `${pl.name} repousse ${other.name}.`,
        });
      }
    }
    // Un rapport que son auteur a effacé ne reviendra pas (sa fiche ne fait
    // qu'avancer) : je n'ai plus besoin de me souvenir que je l'ai appliqué.
    // Couper cette liste par la fin ferait au contraire réappliquer un
    // rapport encore présent chez son auteur.
    const applied = p.applied.filter((id) => live.has(id));
    if (applied.length !== p.applied.length) {
      p.applied = applied;
      any = true;
    }
    return any;
  }

  /**
   * Dégâts visant une de mes flottes : celle-ci, ou celle qui l'a absorbée.
   * Renvoie false si elle n'est plus là (posée entre-temps : les pertes
   * vont alors à la planète où elle s'est posée).
   */
  fleetHit(p, other, e, now) {
    const f = this.fleetOf(p, e.fleet);
    if (!f) return false;
    // Le même combat, que j'ai livré moi aussi sans avoir lu son rapport : mes pertes sont déjà comptées.
    // Le même combat : un des miens contre sa flotte, qu'il ne connaissait pas encore en livrant le
    // sien (absent de son `ack`). Une revanche, livrée après avoir lu mon rapport, est un autre combat.
    // Chaque combat ne sert qu'une fois.
    const mineIds = [f.id, ...(f.absorbed || [])];
    // (À plus de 30 min d'écart, jamais le même : un rapport lu sans être noté ne doit pas annuler une revanche.)
    const g = e.sim && e.by && (p.engaged || []).find((g) => g.id && g.fleet === e.by && mineIds.includes(g.by) && !(e.ack || []).includes(g.id) && Math.abs((g.at || 0) - e.at) < 30 * 60_000);
    if (g) p.engaged = p.engaged.filter((x) => x !== g);
    // Je garde trace de ce rapport lu : mes prochains combats contre lui le citeront (ack).
    p.engaged = [...(p.engaged || []), { fleet: e.by, by: f.id, at: e.at, got: e.id }].slice(-20);
    const ships = g ? {} : e.ships;
    const lost = countShips(ships);
    // Le même combat que le mien : mon carnet l'a déjà, vu de mon côté.
    const noteHit = (destroyed) =>
      g || this.note(p, {
        at: e.at, kind: 'combat', who: other.name, mine: lost, theirs: e.lost ? countShips(e.lost) : null, pillaged: lootText(e.take || {}),
        tone: destroyed ? 'bad' : lost ? 'even' : 'good',
        text: destroyed ? `Ta flotte est détruite par ${other.name}.` : `${other.name} attaque ta flotte.`,
      });
    if (!applyLosses(f, p.race, techOf(p), ships, e.take, now)) {
      p.fleets = p.fleets.filter((x) => x.id !== f.id);
      this.addLog(`Une flotte ${de(p.name)} est détruite par ${other.name}.`);
      this.ontoast?.(`${other.name} a détruit une de tes flottes !`);
      noteHit(true);
      return true;
    }
    this.addLog(`Une flotte ${de(p.name)} est attaquée par ${other.name} : ${lost ? `${shipsText(lost)} perdu${lost > 1 ? 's' : ''}` : 'aucun vaisseau perdu'}.`);
    this.ontoast?.(`${other.name} attaque une de tes flottes !`);
    noteHit(false);
    return true;
  }

  /**
   * Mon carnet : les combats et les planètes perdues qui me concernent, vus de
   * mon côté (pertes des deux côtés, `loot` que j'ai pris, `pillaged` qu'on m'a pris). Gardé sur ce téléphone seulement,
   * avec la sauvegarde ; il ne part pas sur le réseau. `n` numérote les
   * entrées : celles au-delà de `read` sont neuves (résumé « pendant ton
   * absence »). `at` : l'heure du combat, qui peut être dans le passé (D-109).
   */
  note(p, entry) {
    if (p.id !== this.me) return;
    const j = (this.journal ||= { n: 0, read: 0, list: [] });
    j.n += 1;
    j.list = [...j.list, { n: j.n, ...entry }].slice(-JOURNAL_MAX);
    this.onnote?.(j.list.at(-1));
  }

  /** Tout mon carnet est lu (jusqu'à `n`, ou jusqu'au bout). */
  markRead(n) {
    const j = this.journal;
    if (!j || j.read >= (n ?? j.n)) return;
    j.read = Math.min(n ?? j.n, j.n);
    this.save();
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
    if (this.state && this.me && this.status === 'playing') saveGame(this.me, this.state, this.journal);
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

/**
 * Ce que je sais des autres a changé depuis ma dernière entrée : { s: { pid:
 * nombre d'entrées de son journal dans ma copie } }, ou rien. Le rejeu redonne
 * ainsi à chacun, à chaque ordre, les fiches des autres telles qu'il les
 * voyait (même partie coupée en deux, même horloges décalées).
 */
function seenNews(state, me) {
  const mine = state.players[me];
  if (!mine) return {};
  const before = {};
  for (const o of mine.orders || []) if (o.s) Object.assign(before, o.s);
  const s = {};
  for (const p of Object.values(state.players)) {
    const n = p.orders?.length || 0;
    if (p.id !== me && before[p.id] !== n) s[p.id] = n;
  }
  return Object.keys(s).length ? { s } : {};
}

/**
 * Ce qui change ma fiche, noté pour le rejeu : mes ordres, et les passages
 * (`tick`) qui ont fait avancer quelque chose (voir touch). Le reste de la partie vient des fiches des
 * autres, qui ont chacune leur journal.
 */
/** Mêmes niveaux de technologies, quel que soit l'ordre des clés. */
function sameTech(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  return [...keys].every((k) => (Number(a?.[k]) || 0) === (Number(b?.[k]) || 0));
}

/** Les plus hauts niveaux de deux listes de technologies. */
function maxTech(a, b) {
  const out = { ...(a || {}) };
  for (const [k, n] of Object.entries(b || {})) if ((Number(n) || 0) > (Number(out[k]) || 0)) out[k] = n;
  return out;
}

export const ORDER_KINDS = ['chooseRace', 'ready', 'begin', 'claimPlanet', 'build', 'planBuild', 'unplan', 'demolish', 'research', 'buildShips', 'takeOff', 'moveFleet', 'stopFleet', 'setFleetStance', 'chaseFleet', 'proposeTrade', 'answerTrade', 'refuelFleet', 'transferFleet', 'mergeFleets', 'splitFleet', 'returnFleet', 'power'];
for (const k of [...ORDER_KINDS, 'tick']) {
  const act = Session.prototype[k];
  Session.prototype[k] = function (...a) {
    if (this.entry || !this.state) return act.apply(this, a); // un ordre dans un ordre : déjà noté
    while (a.length && a[a.length - 1] === undefined) a.pop();
    this.entry = { t: this.now(), k, ...(a.length ? { a: JSON.parse(JSON.stringify(a)) } : {}), ...seenNews(this.state, this.me) };
    this.entryKept = false;
    try {
      return act.apply(this, a);
    } finally {
      // Un ordre refusé a pu faire avancer l'heure d'une planète (calculs
      // arrondis autrement) : on le garde aussi, et ma fiche change d'heure
      // pour que les autres l'adoptent (à heure égale, chacun garde la sienne).
      const p = this.state.players[this.me];
      if (!this.entryKept && k !== 'tick' && p) {
        this.touch();
        this.scheduleSave();
      }
      this.entry = null;
    }
  };
}
