// Côté MJ : détient l'état officiel de la partie, valide les ordres,
// diffuse les changements. Les joueurs sont connectés en étoile au MJ.

import { createInvite } from './peer.js';
import { newPlanet, settle, startBuild, BUILDINGS } from './game.js';

const COLORS = ['#7aa2ff', '#ff9f6b', '#7cf0b4', '#f7d06b', '#d38bff', '#6fd3ff', '#ff7a93', '#b7e36b'];
const MAX_PLAYERS = 8;

function rid(n = 8) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, n);
}

export class HostSession {
  constructor(name) {
    this.role = 'mj';
    this.gid = rid(6);
    this.me = 'mj';
    this.links = new Map(); // pid -> Link
    this.pending = []; // demandes en attente de validation
    this.log = [];
    this.players = {};
    this.onchange = null;
    this.ontoast = null;
    this.invite = null;
    const now = this.now();
    this.players.mj = { id: 'mj', name, color: COLORS[0], planet: newPlanet(now), online: true, mj: true, rtt: 0, route: null };
    this.addLog(`${name} ouvre la partie.`);
    this.timer = setInterval(() => this.tick(), 250);
  }

  now() {
    return Date.now();
  }

  // ----- invitations -----

  async openInvite() {
    this.invite?.cancel();
    this.invite = await createInvite();
    return this.invite.code;
  }

  /** Le MJ fournit la réponse scannée ou collée. */
  async acceptAnswer(answer) {
    if (!this.invite) throw Object.assign(new Error('Cette invitation a déjà servi.'), { used: true });
    const invite = this.invite;
    const link = await invite.accept(answer);
    if (this.invite === invite) this.invite = null;
    link.onmessage = (msg) => this.onPreJoin(link, msg);
    link.onclose = () => {
      this.pending = this.pending.filter((p) => p.link !== link);
      this.changed();
    };
    return link;
  }

  cancelInvite() {
    this.invite?.cancel();
    this.invite = null;
  }

  onPreJoin(link, msg) {
    if (msg.type === 'ping') return link.send({ type: 'pong', t0: msg.t0, ts: this.now() });
    if (msg.type !== 'hello') return;
    const name = String(msg.name || '').trim().slice(0, 16) || 'Joueur';
    const back = msg.gid === this.gid && this.players[msg.pid] && !this.players[msg.pid].online ? msg.pid : null;
    this.pending.push({ id: rid(), name, link, back });
    this.ontoast?.(back ? `${name} veut revenir dans la partie.` : `${name} veut rejoindre la partie.`);
    this.changed();
  }

  approve(reqId) {
    const req = this.pending.find((p) => p.id === reqId);
    if (!req) return;
    this.pending = this.pending.filter((p) => p !== req);
    let pid = req.back;
    if (!pid) {
      const count = Object.keys(this.players).length;
      if (count >= MAX_PLAYERS) {
        req.link.send({ type: 'refused', reason: 'La partie est complète.' });
        setTimeout(() => req.link.close(), 300);
        return this.changed();
      }
      pid = rid(6);
      this.players[pid] = {
        id: pid,
        name: req.name,
        color: COLORS[count % COLORS.length],
        planet: newPlanet(this.now()),
        online: true,
        rtt: null,
        route: null,
      };
      this.addLog(`${req.name} rejoint la partie.`);
    } else {
      this.players[pid].online = true;
      this.addLog(`${req.name} est de retour.`);
    }
    this.bind(pid, req.link);
    req.link.send({ type: 'welcome', you: pid, gid: this.gid, state: this.snapshot() });
    this.broadcast();
  }

  refuse(reqId) {
    const req = this.pending.find((p) => p.id === reqId);
    if (!req) return;
    this.pending = this.pending.filter((p) => p !== req);
    req.link.send({ type: 'refused', reason: 'Le MJ a refusé ta demande.' });
    setTimeout(() => req.link.close(), 300);
    this.changed();
  }

  bind(pid, link) {
    this.links.get(pid)?.close();
    this.links.set(pid, link);
    link.onmessage = (msg) => this.onMessage(pid, link, msg);
    link.onclose = () => {
      if (this.links.get(pid) !== link) return;
      this.links.delete(pid);
      const p = this.players[pid];
      if (p) {
        p.online = false;
        this.addLog(`${p.name} a perdu la connexion.`);
      }
      this.broadcast();
    };
  }

  // ----- jeu -----

  onMessage(pid, link, msg) {
    const p = this.players[pid];
    switch (msg.type) {
      case 'ping':
        return link.send({ type: 'pong', t0: msg.t0, ts: this.now() });
      case 'status':
        p.rtt = Number.isFinite(msg.rtt) ? Math.round(msg.rtt) : null;
        p.route = typeof msg.route === 'string' ? msg.route.slice(0, 8) : null;
        return;
      case 'build': {
        const err = this.applyBuild(pid, msg.key);
        if (err) link.send({ type: 'error', message: err });
        return;
      }
    }
  }

  applyBuild(pid, key) {
    const p = this.players[pid];
    const err = startBuild(p.planet, key, this.now());
    if (err) return err;
    const q = p.planet.queue;
    this.addLog(`${p.name} lance ${BUILDINGS[key].name} niv. ${q.level}.`);
    this.broadcast();
    return null;
  }

  /** Ordre du MJ pour sa propre planète. */
  build(key) {
    const err = this.applyBuild('mj', key);
    if (err) this.ontoast?.(err);
  }

  tick() {
    const now = this.now();
    let changed = false;
    for (const p of Object.values(this.players)) {
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

  // ----- diffusion -----

  addLog(text) {
    this.log.push({ at: this.now(), text });
    if (this.log.length > 40) this.log.shift();
  }

  snapshot() {
    const players = {};
    for (const [id, p] of Object.entries(this.players)) {
      players[id] = { id, name: p.name, color: p.color, planet: p.planet, online: p.online, mj: !!p.mj, rtt: p.rtt, route: p.route };
    }
    return { players, log: this.log.slice(-20) };
  }

  broadcast() {
    const msg = { type: 'state', state: this.snapshot() };
    for (const link of this.links.values()) link.send(msg);
    this.changed();
  }

  changed() {
    this.onchange?.('state');
  }

  get state() {
    return this.snapshot();
  }

  end() {
    clearInterval(this.timer);
    this.cancelInvite();
    for (const link of this.links.values()) {
      link.send({ type: 'ended' });
      link.close();
    }
  }
}
