// Rejeu d'une partie à partir des journaux d'ordres.
//
// Chaque joueur note dans sa fiche ce qui l'a changée (`orders`) : ses
// ordres et les passages (`tick`) où quelque chose a avancé (chantier
// terminé, arrivée, combat), avec l'heure et les identifiants tirés. Comme
// chaque joueur est le seul à écrire sa fiche, et que tout se calcule à
// partir de l'heure, rejouer ces journaux dans l'ordre des heures, sur une
// horloge commune, refait la partie.
//
// Limite : on rejoue comme si tout le monde était connecté. Ce qui dépend
// du moment où une fiche est arrivée chez un autre (partie coupée en deux,
// téléphone en veille) peut tourner autrement. `faithful` dit si la fin du
// rejeu retombe sur les fiches de la vraie partie.

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
  const missing = Object.values(state?.players || {}).filter((p) => p.race && p.orders?.[0]?.k !== 'chooseRace');
  return { ok: !!state?.players && missing.length === 0, missing: missing.map((p) => p.name) };
}

/**
 * Rejoue la partie `state` (une copie complète, celle de la sauvegarde).
 * Renvoie {
 *   frames : [{ t, pid, k, a, fiche }] — une image par événement, avec la
 *            fiche du joueur concerné juste après (sans son journal) ;
 *   log    : [{ at, pid, text }] — tout le journal de la partie, sans limite ;
 *   players: { pid: fiche } — les fiches à la fin du rejeu ;
 *   faithful : { pid: bool } — la fiche rejouée est-elle celle de la partie ?
 * }
 */
export function replay(state) {
  const fiches = Object.values(state.players).sort((a, b) => a.rank - b.rank || (a.id < b.id ? -1 : 1));
  const events = [];
  for (const p of fiches) {
    events.push({ t: p.rank, pid: p.id, k: 'join' });
    for (const o of p.orders || []) events.push({ ...o, pid: p.id });
  }
  // Ordre des heures ; à égalité, l'ordre des journaux (stable).
  events.sort((a, b) => a.t - b.t);

  const clock = { t: 0 };
  const sessions = new Map();
  const log = [];
  const frames = [];
  for (const e of events) {
    clock.t = e.t;
    let s = sessions.get(e.pid);
    if (e.k === 'join') {
      const p = fiches.find((x) => x.id === e.pid);
      s = new Session(p.name);
      // Un téléphone sans réseau ni sauvegarde, à l'heure du rejeu.
      Object.assign(s, { now: () => clock.t, start() {}, meet() {}, save() {}, scheduleSave() {}, me: p.id, status: 'playing' });
      const others = sessions.values().next().value;
      s.state = { gid: state.gid, key: state.key, players: others ? copy(others.state.players) : {}, log: [] };
      s.state.players[p.id] = normalize(firstFiche(p));
      const add = s.addLog.bind(s);
      s.addLog = (text) => {
        const entry = add(text);
        log.push({ at: entry.at, pid: p.id, text });
        return entry;
      };
      sessions.set(p.id, s);
    } else {
      s.replayIds = [...(e.ids || [])];
      if (e.k === 'tick') s.tick();
      else if (typeof s[e.k] === 'function') s[e.k](...(e.a || []).map((v) => (v === null ? undefined : v)));
      s.replayIds = null;
    }
    // Tout le monde reçoit la fiche du joueur qui vient de changer.
    const fiche = s.state.players[e.pid];
    for (const o of sessions.values()) if (o !== s) o.onRecord(null, copy(fiche));
    const { orders, online, ...shown } = fiche;
    frames.push({ t: e.t, pid: e.pid, k: e.k, a: e.a, fiche: copy(shown) });
  }

  const players = {};
  const faithful = {};
  for (const [pid, s] of sessions) {
    players[pid] = s.state.players[pid];
    faithful[pid] = comparable(players[pid]) === comparable(state.players[pid]);
  }
  return { frames, log, players, faithful };
}

/** Les fiches de tous les joueurs à l'image `i` (la dernière connue de chacun). */
export function playersAt(frames, i) {
  const out = {};
  for (let j = 0; j <= i && j < frames.length; j++) out[frames[j].pid] = frames[j].fiche;
  return out;
}
