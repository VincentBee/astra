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

const SAVE_KEY = 'astra.save'; // la partie en cours
const SAVES_KEY = 'astra.saves'; // historique : { gid: sauvegarde }
const ID_KEY = 'astra.identity'; // mon identité dans la partie en cours
const IDS_KEY = 'astra.identities'; // historique : { gid: identité }
const KEEP = 10; // nombre de parties gardées dans l'historique

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k) || 'null') ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const valid = (s) => s && s.v === 1 && s.state?.players;

/** Range la partie en cours et la garde dans l'historique (les plus récentes seulement). */
export function saveGame(me, state) {
  const save = { v: 1, me, savedAt: Date.now(), state };
  const all = archive(); // avant d'écraser la partie en cours, pour la garder
  all[state.gid] = save;
  write(SAVE_KEY, save);
  const keep = Object.values(all).sort((a, b) => b.savedAt - a.savedAt).slice(0, KEEP);
  write(SAVES_KEY, Object.fromEntries(keep.map((x) => [x.state.gid, x])));
}

/** { me, savedAt, state } de la partie en cours, ou null. */
export function loadGame() {
  const s = read(SAVE_KEY, null);
  return valid(s) ? s : null;
}

/** L'historique, sauvegardes d'avant l'historique comprises. */
function archive() {
  const all = read(SAVES_KEY, {});
  const cur = loadGame();
  if (cur && !all[cur.state.gid]) all[cur.state.gid] = cur;
  return all;
}

/** Les dernières parties jouées sur ce téléphone, la plus récente d'abord. */
export function listGames() {
  return Object.values(archive())
    .filter(valid)
    .sort((a, b) => b.savedAt - a.savedAt);
}

/** Fait d'une partie de l'historique la partie en cours (avec mon identité dedans). */
export function selectGame(gid) {
  const save = archive()[gid];
  if (!valid(save)) return null;
  write(SAVE_KEY, save);
  const id = identities()[gid];
  if (id) write(ID_KEY, id);
  return save;
}

/** Retire une partie de l'historique (et de la partie en cours si c'est elle). */
export function forgetGame(gid) {
  const all = archive();
  delete all[gid];
  write(SAVES_KEY, all);
  if (loadGame()?.state.gid === gid) {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {}
  }
  const ids = identities();
  delete ids[gid];
  write(IDS_KEY, ids);
}

function identities() {
  const ids = read(IDS_KEY, {});
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
