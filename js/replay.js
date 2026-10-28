// Rejeu d'une partie à partir des journaux d'ordres.
//
// Chaque joueur note dans sa fiche ce qui l'a changée (`orders`) : ses
// ordres et les passages (`tick`) où quelque chose a avancé (chantier
// terminé, arrivée, combat), avec l'heure et les identifiants tirés. Comme
// chaque joueur est le seul à écrire sa fiche, et que tout se calcule à
// partir de l'heure, rejouer ces journaux dans l'ordre des heures, sur une
// horloge commune, refait la partie.
//
// Chaque entrée dit aussi combien d'entrées des journaux des autres le
// joueur avait reçues : au rejeu, il retrouve les fiches des autres telles
// qu'il les voyait, même partie coupée en deux ou horloges décalées.
// `faithful` dit si la fin du rejeu retombe sur les fiches de la vraie partie.

import { Session, normalize } from './session.js';

const copy = (x) => JSON.parse(JSON.stringify(x));

/** Fiche de départ d'un joueur, telle qu'à son arrivée dans la partie. */
function firstFiche(p) {
  return { id: p.id, name: p.name, rank: p.rank, color: p.color, secretHash: p.secretHash, race: null, planet: null, home: null, actAt: p.rank };
}

/**
 * Texte stable d'une valeur (clés triées), pour comparer deux fiches. Les
 * nombres sont arrondis à 10 chiffres : deux navigateurs ne calculent pas
 * les puissances et exponentielles au dernier chiffre près.
 */
function stable(x) {
  if (typeof x === 'number') return JSON.stringify(Number.isFinite(x) ? Number(x.toPrecision(10)) : x);
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`;
  if (x && typeof x === 'object') {
    return `{${Object.keys(x)
      .filter((k) => x[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(x[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x);
}

/** Fiche comparable : complétée comme à la lecture, sans ce qui ne dépend que du téléphone. */
export const comparable = (p) => {
  const { online, ...rest } = normalize(copy(p));
  return stable(rest);
};

/**
 * Un journal se rejoue depuis le début s'il commence au choix de la race
 * (sinon : ordres d'avant le journal, ou trop anciens et effacés).
 */
export function replayable(state) {
  const players = Object.values(state?.players || {});
  const missing = players.filter((p) => p.race && p.orders?.[0]?.k !== 'chooseRace');
  // Copie pas encore à jour : un joueur dit connaître des entrées du journal d'un autre que
  // cette copie n'a pas encore reçues (les fiches voyagent une par une).
  const stale = players.some((p) =>
    (p.orders || []).some((o) => Object.entries(o.s || {}).some(([pid, n]) => n > (state.players[pid]?.orders?.length ?? Infinity))),
  );
  return { ok: !!state?.players && missing.length === 0 && !stale, missing: missing.map((p) => p.name), stale };
}

/**
 * Rejoue la partie `state` (une copie complète, celle de la sauvegarde).
 * Renvoie {
 *   frames : [{ t, pid, k, a, fiche }] — une image par entrée, dans l'ordre
 *            des heures, avec la fiche du joueur juste après (sans son journal) ;
 *   log    : [{ at, pid, text }] — tout le journal de la partie, sans limite ;
 *   players: { pid: fiche } — les fiches à la fin du rejeu ;
 *   faithful : { pid: bool } — la fiche rejouée est-elle celle de la partie ?
 * }
 * Lance une erreur si les journaux se contredisent (chacun dit connaître
 * une entrée de l'autre que celui-ci n'a pas encore écrite).
 */
export function replay(state) {
  const fiches = Object.values(state.players).sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
  const orders = Object.fromEntries(fiches.map((p) => [p.id, p.orders || []]));
  // Les fiches des autres dont quelqu'un aura besoin : après n entrées de leur journal.
  const need = Object.fromEntries(fiches.map((p) => [p.id, new Set([0])]));
  for (const p of fiches) for (const o of orders[p.id]) for (const [pid, n] of Object.entries(o.s || {})) need[pid]?.add(n);
  const snaps = Object.fromEntries(fiches.map((p) => [p.id, new Map([[0, normalize(firstFiche(p))]])]));

  const log = [];
  const frames = [];
  const done = {}; // entrées rejouées, par joueur
  const known = {}; // ce que chacun sait des autres : pid -> { autre: n }
  const shown = {}; // la copie des autres que chacun a en ce moment : pid -> { autre: n }
  const busy = new Set();
  const sessions = new Map();
  for (const p of fiches) {
    const s = new Session(p.name);
    // Un téléphone sans réseau ni sauvegarde, à l'heure de l'entrée rejouée.
    Object.assign(s, { at: p.rank, now: () => s.at, start() {}, meet() {}, save() {}, scheduleSave() {}, me: p.id, status: 'playing' });
    s.state = { gid: state.gid, key: state.key, players: { [p.id]: normalize(firstFiche(p)) }, log: [] };
    const add = s.addLog.bind(s);
    s.addLog = (text) => {
      const entry = add(text);
      log.push({ at: entry.at, pid: p.id, text });
      return entry;
    };
    sessions.set(p.id, s);
    done[p.id] = 0;
    known[p.id] = {};
    shown[p.id] = {};
  }

  /** Rejoue l'entrée suivante du journal de `pid`. */
  const next = (pid) => {
    const e = orders[pid][done[pid]];
    const s = sessions.get(pid);
    busy.add(pid);
    Object.assign(known[pid], e.s);
    // Les fiches des autres, telles que ce joueur les avait à ce moment-là.
    for (const [other, n] of Object.entries(known[pid])) {
      if (!sessions.has(other) || shown[pid][other] === n) continue;
      while (done[other] < n) {
        if (busy.has(other) || done[other] >= orders[other].length) throw new Error('Journaux incohérents.');
        next(other);
      }
      s.state.players[other] = { ...copy(snaps[other].get(n)), orders: orders[other].slice(0, n) };
      shown[pid][other] = n;
    }
    s.at = e.t;
    s.replayIds = [...(e.ids || [])];
    if (e.k === 'tick') s.tick();
    else if (typeof s[e.k] === 'function') s[e.k](...(e.a || []).map((v) => (v === null ? undefined : v)));
    s.replayIds = null;
    busy.delete(pid);
    done[pid]++;
    const { orders: _, online, ...fiche } = s.state.players[pid];
    if (need[pid].has(done[pid])) snaps[pid].set(done[pid], copy(fiche));
    frames.push({ t: e.t, pid, k: e.k, a: e.a, fiche: copy(fiche) });
  };

  // Dans l'ordre des heures ; une entrée qui en attend une autre la fait passer avant elle.
  const events = fiches.flatMap((p) => orders[p.id].map((o, i) => ({ t: o.t, pid: p.id, i })));
  events.sort((a, b) => a.t - b.t);
  // (Une heure qui recule sur un téléphone : ses entrées restent dans l'ordre de son journal.)
  for (const e of events) while (done[e.pid] <= e.i) next(e.pid);
  frames.sort((a, b) => a.t - b.t);

  const players = {};
  const faithful = {};
  for (const [pid, s] of sessions) {
    players[pid] = s.state.players[pid];
    faithful[pid] = comparable(players[pid]) === comparable(state.players[pid]);
  }
  return { frames, log: log.sort((a, b) => a.at - b.at), players, faithful };
}

/** Les fiches de tous les joueurs à l'image `i` (la dernière connue de chacun). */
export function playersAt(frames, i) {
  const out = {};
  for (let j = 0; j <= i && j < frames.length; j++) out[frames[j].pid] = frames[j].fiche;
  return out;
}
