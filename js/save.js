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

const SAVE_KEY = 'astra.save';

export function saveGame(me, state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, me, savedAt: Date.now(), state }));
  } catch {}
}

/** { me, savedAt, state } ou null. */
export function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    return s && s.v === 1 && s.state?.players ? s : null;
  } catch {
    return null;
  }
}

export function forgetGame() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

/**
 * Fusionne `other` dans `base` (copies de la même partie) et renvoie une
 * nouvelle copie. `base` l'emporte à égalité. Ne touche ni au MJ ni aux
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
