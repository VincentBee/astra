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
