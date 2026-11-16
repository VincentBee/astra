/**
 * Brouillard sur les planètes (D-124) : ce que je sais de la case `cell`.
 * Dans ma portée (ou la partie finie) : son vrai propriétaire, retenu dans
 * mes renseignements (`intel`, propre à ce téléphone, gardé avec la
 * sauvegarde). Hors de portée : le propriétaire vu la dernière fois, même
 * s'il l'a perdue depuis ; jamais vue : rien, elle paraît libre.
 * { owner, live, at } — `live` : vu maintenant ; `at` : quand il a été vu.
 */
export function knownOwner(cell, now = this.now(), eyes = this.eyes(now)) {
  const real = this.ownerAt(cell);
  if (real?.id === this.me || this.over) return { owner: real, live: true, at: now };
  const k = `${cell.x},${cell.y}`;
  const intel = (this.intel ||= {});
  if (this.seesCell(cell, now, eyes)) {
    if (real ? intel[k]?.pid !== real.id : intel[k]) {
      if (real) intel[k] = { pid: real.id, at: now };
      else delete intel[k];
      this.scheduleSave();
    } else if (real) intel[k].at = now;
    return { owner: real, live: true, at: now };
  }
  const memo = intel[k];
  const owner = memo && this.state.players[memo.pid];
  return owner ? { owner, live: false, at: memo.at } : { owner: null, live: false, at: null };
}
