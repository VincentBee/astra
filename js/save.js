// Sauvegarde de la partie sur le téléphone, et fusion de deux copies.
//
// Chaque téléphone enregistre sa copie de la partie à chaque changement.
// Comme tout se calcule à partir du temps écoulé (production, chantiers),
// la partie « continue » même quand personne n'est connecté : celui qui la
// reprend, même le lendemain, retrouve tout à jour.
//
// Quand deux copies se retrouvent (deux joueurs ont avancé chacun de leur
// côté), on les fusionne joueur par joueur : pour chacun, on garde la copie
// où il a agi le plus récemment (`actAt`). Chacun garde ainsi sa propre
// progression. Le journal est l'union des deux.

const SAVE_KEY = 'astra.save'; // la partie en cours (elle seule, D-240)
const GAME_KEY = 'astra.save.'; // + gid : une partie de l'historique, autre que celle en cours
const INDEX_KEY = 'astra.games'; // historique : { gid: savedAt }, parties autres que celle en cours
const OLD_KEY = 'astra.saves'; // ancien historique d'un seul bloc (avant D-240), repris puis effacé
const ID_KEY = 'astra.identity'; // mon identité dans la partie en cours
const IDS_KEY = 'astra.identities'; // historique : { gid: identité }
const KEEP = 10; // nombre de parties gardées, partie en cours comprise

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
};
/** Écrit sans lever : `true`, `'full'` si la mémoire est pleine, `false` pour un autre refus (stockage bloqué). */
const put = (k, v) => {
  try {
    localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    return true;
  } catch (e) {
    return isFull(e) ? 'full' : false;
  }
};
const write = (k, v) => put(k, v) === true;
// Mémoire pleine, selon les navigateurs (Chromium, Safari : QuotaExceededError, code 22 ; ancien Firefox).
const isFull = (e) => e?.name === 'QuotaExceededError' || e?.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e?.code === 22 || e?.code === 1014;
const remove = (k) => {
  try {
    localStorage.removeItem(k);
  } catch {}
};
const valid = (s) => s && s.v === 1 && s.state?.players;
// Objet simple { clé: valeur } : ni null, ni tableau, ni texte (stockage abîmé, D-170).
const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// ----- Prévenir le joueur (D-240) : save.js ne connaît pas l'écran, app.js s'abonne.
let failed = null;
let told = -Infinity;
const RETELL = 60_000; // échecs à la suite : on prévient de nouveau au plus une fois par minute
/**
 * `fn()` est appelé quand une sauvegarde de la partie en cours échoue (au plus une fois par
 * minute). Il renvoie `false` si le message n'a pas pu être montré (appli cachée) : on
 * préviendra au prochain échec.
 */
export function onSaveFailed(fn) {
  failed = fn;
}
function report(ok) {
  if (ok) told = -Infinity;
  else if (Date.now() - told >= RETELL) {
    try {
      if (failed?.() !== false) told = Date.now();
    } catch {}
  }
  return ok;
}

// ----- Historique : une clé par partie, et un petit index (D-240)

/** { gid: savedAt } des parties de l'historique (sans la partie en cours). */
function index() {
  migrate();
  const raw = read(INDEX_KEY, null);
  const out = {};
  if (isMap(raw)) for (const [gid, at] of Object.entries(raw)) out[gid] = Number(at) || 0;
  // Index perdu, abîmé ou en retard : les clés présentes y sont remises (D-170).
  for (const gid of keys()) if (!(gid in out)) out[gid] = stored(gid)?.savedAt ?? 0;
  return out;
}

/** Les gid des clés `astra.save.<gid>` présentes (si le navigateur sait les énumérer). */
function keys() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(GAME_KEY)) out.push(k.slice(GAME_KEY.length));
    }
  } catch {}
  return out;
}

/** Les gid de l'index, la plus ancienne d'abord. */
const oldestFirst = (idx) => Object.keys(idx).sort((a, b) => idx[a] - idx[b]);

/**
 * Écrit `k`. Si la mémoire est pleine, retire la plus ancienne partie de l'historique (jamais
 * celles de `keep`) et réessaie, jusqu'à ce que ça passe. Si rien n'y fait, les parties retirées
 * sont remises (elles tenaient avant) et la réponse est `false` : on n'a rien perdu pour rien.
 * `idx` est l'index en mémoire, tenu à jour.
 */
function fit(k, text, idx, keep) {
  const taken = [];
  for (;;) {
    const r = put(k, text);
    if (r === true) {
      if (taken.length) write(INDEX_KEY, idx);
      return true;
    }
    const gid = r === 'full' && oldestFirst(idx).find((g) => !keep.includes(g));
    if (!gid) break;
    taken.push([gid, idx[gid], localStorage.getItem(GAME_KEY + gid)]);
    drop(gid, idx);
  }
  for (const [gid, at, text] of taken.reverse()) {
    if (text != null && write(GAME_KEY + gid, text)) idx[gid] = at;
  }
  return false;
}
function drop(gid, idx) {
  delete idx[gid];
  remove(GAME_KEY + gid);
}

/** Range `save` (ancienne partie en cours) dans l'historique, en ne gardant que les plus récentes. */
function archiveSave(save, idx, keep) {
  const gid = save.state.gid;
  idx[gid] = save.savedAt;
  for (const g of oldestFirst(idx).slice(0, Math.max(0, Object.keys(idx).length - (KEEP - 1)))) drop(g, idx);
  if (!(gid in idx)) return; // la plus vieille de toutes : elle sort
  if (!fit(GAME_KEY + gid, JSON.stringify(save), idx, [...keep, gid])) drop(gid, idx);
  fit(INDEX_KEY, JSON.stringify(idx), idx, keep);
}

/**
 * Reprise de l'ancien format (avant D-240) : `astra.saves` contenait tout l'historique, partie
 * en cours comprise. On le lit, on l'efface d'abord (sinon la place manque pour recopier), puis
 * chaque partie reçoit sa clé, la plus récente d'abord. Les entrées abîmées sont laissées (D-170).
 */
function migrate() {
  let raw;
  try {
    raw = localStorage.getItem(OLD_KEY);
  } catch {
    return;
  }
  if (raw == null) return;
  let old = null;
  try {
    old = JSON.parse(raw);
  } catch {}
  const cur = read(SAVE_KEY, null);
  const curGid = valid(cur) ? cur.state.gid : null;
  const all = isMap(old) ? Object.values(old).filter(valid) : [];
  const fresher = all.find((s) => s.state.gid === curGid && s.savedAt > cur.savedAt);
  const list = all.filter((s) => s.state.gid !== curGid);
  remove(OLD_KEY);
  if (fresher) write(SAVE_KEY, fresher); // l'ancien format écrivait deux copies : on garde la plus récente
  const idx = {};
  const prev = read(INDEX_KEY, {});
  if (isMap(prev)) Object.assign(idx, prev);
  for (const s of list.sort((a, b) => b.savedAt - a.savedAt)) {
    if (s.state.gid in idx || Object.keys(idx).length >= KEEP - 1) continue;
    if (!write(GAME_KEY + s.state.gid, s)) break; // tenait avant : n'arrive pas en pratique
    idx[s.state.gid] = s.savedAt;
  }
  write(INDEX_KEY, idx);
}

/**
 * Range la partie en cours. Seule `astra.save` est réécrite (D-240) : l'historique ne change
 * qu'au changement de partie. Mémoire pleine : on retire les plus anciennes parties de
 * l'historique jusqu'à ce que ça passe ; sinon le joueur est prévenu (`onSaveFailed`).
 * `journal` : mon carnet de combats (D-110), propre à ce téléphone.
 * `intel` : ce que j'ai vu des planètes des autres (brouillard, D-124), propre à ce téléphone.
 * `bots` : identifiants des joueurs IA que ce téléphone fait jouer (D-151).
 * Renvoie `true` si la partie est sauvée.
 */
export function saveGame(me, state, journal, intel, bots) {
  const save = { v: 1, me, savedAt: Date.now(), state, ...(journal ? { journal } : {}), ...(intel ? { intel } : {}), ...(bots?.length ? { bots } : {}) };
  const gid = state.gid;
  const idx = index();
  const prev = loadGame();
  const text = JSON.stringify(save);
  let ok = put(SAVE_KEY, text) === true;
  if (!ok) {
    // Une ancienne copie de cette partie dans l'historique fait de la place la première : elle
    // ne sert plus. Ensuite seulement, les plus vieilles parties.
    const copy = gid in idx ? [localStorage.getItem(GAME_KEY + gid), idx[gid]] : null;
    if (copy) drop(gid, idx);
    ok = fit(SAVE_KEY, text, idx, [gid]);
    if (!ok && copy?.[0] != null && write(GAME_KEY + gid, copy[0])) idx[gid] = copy[1]; // rien n'est perdu
  }
  if (!ok) return report(false);
  const twice = gid in idx;
  if (twice) drop(gid, idx); // stockée une seule fois
  if (prev && prev.state.gid !== gid) archiveSave(prev, idx, [gid]); // l'ancienne partie en cours rejoint l'historique
  else if (twice) write(INDEX_KEY, idx);
  return report(true);
}

/** { me, savedAt, state } de la partie en cours, ou null. */
export function loadGame() {
  migrate();
  const s = read(SAVE_KEY, null);
  return valid(s) ? s : null;
}

/** Une partie de l'historique, ou null (absente ou abîmée, D-170). */
function stored(gid) {
  const s = read(GAME_KEY + gid, null);
  return valid(s) && s.state.gid === gid ? s : null;
}

/** Les dernières parties jouées sur ce téléphone, la plus récente d'abord. */
export function listGames() {
  const cur = loadGame();
  const out = Object.keys(index())
    .filter((gid) => gid !== cur?.state.gid)
    .map(stored)
    .filter(Boolean);
  if (cur) out.push(cur);
  return out.sort((a, b) => b.savedAt - a.savedAt);
}

/** Fait d'une partie de l'historique la partie en cours (avec mon identité dedans). */
export function selectGame(gid) {
  const cur = loadGame();
  const save = cur?.state.gid === gid ? cur : stored(gid);
  if (!save) return null;
  if (save !== cur) {
    const idx = index();
    const text = JSON.stringify(save);
    // D'abord la mettre en cours. Si la place manque, sa propre copie dans l'historique (qui ne
    // servira plus) part la première, avant toute autre partie.
    if (put(SAVE_KEY, text) !== true) {
      drop(gid, idx);
      if (!fit(SAVE_KEY, text, idx, [gid])) {
        write(GAME_KEY + gid, text); // remise à sa place : rien n'est perdu
        return null;
      }
    }
    drop(gid, idx);
    if (cur) archiveSave(cur, idx, [gid]);
    else write(INDEX_KEY, idx);
  }
  const id = identities()[gid];
  if (id) write(ID_KEY, id);
  return save;
}

/** Retire une partie de l'historique (et de la partie en cours si c'est elle). */
export function forgetGame(gid) {
  const idx = index();
  if (gid in idx) {
    drop(gid, idx);
    write(INDEX_KEY, idx);
  }
  remove(GAME_KEY + gid);
  if (loadGame()?.state.gid === gid) remove(SAVE_KEY);
  const ids = identities();
  delete ids[gid];
  write(IDS_KEY, ids);
}

function identities() {
  const raw = read(IDS_KEY, {});
  const ids = isMap(raw) ? raw : {};
  const cur = read(ID_KEY, null);
  if (cur?.gid && !ids[cur.gid]) ids[cur.gid] = cur;
  return ids;
}

export const loadIdentity = () => read(ID_KEY, null);

/** Mon identité dans la partie en cours, gardée aussi pour la reprendre plus tard. */
export function saveIdentity(id) {
  const ids = identities(); // avant d'écraser l'identité en cours, pour la garder
  ids[id.gid] = id;
  write(IDS_KEY, ids);
  write(ID_KEY, id);
}

/**
 * Fusionne `other` dans `base` (copies de la même partie) et renvoie une
 * nouvelle copie. `base` l'emporte à égalité. Ne touche pas aux
 * statuts en ligne : c'est à l'appelant de les fixer.
 */
export function mergeStates(base, other) {
  if (!other || other.gid !== base.gid) return base;
  const out = JSON.parse(JSON.stringify(base));
  for (const [pid, theirs] of Object.entries(other.players || {})) {
    const ours = out.players[pid];
    if (!ours || (theirs.actAt || 0) > (ours.actAt || 0)) {
      out.players[pid] = { ...JSON.parse(JSON.stringify(theirs)), online: ours ? ours.online : false };
    }
  }
  // Ancienneté : on garde l'ordre d'arrivée, nouveaux venus des deux côtés compris.
  const ranks = Object.values(out.players).map((p) => p.rank);
  out.nextRank = Math.max(out.nextRank || 0, other.nextRank || 0, ...ranks.map((r) => r + 1));
  out.epoch = Math.max(out.epoch || 0, other.epoch || 0);
  const seen = new Set();
  out.log = [...(base.log || []), ...(other.log || [])]
    .filter((l) => {
      const k = `${l.at}|${l.text}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => a.at - b.at)
    .slice(-40);
  return out;
}

/** Résumé lisible d'une partie sauvegardée (écran d'accueil). */
export function describeSave(save) {
  const players = Object.values(save.state.players);
  return {
    names: players.sort((a, b) => a.rank - b.rank).map((p) => p.name),
    me: save.state.players[save.me]?.name,
    savedAt: save.savedAt,
  };
}
