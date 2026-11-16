import { mergeStates } from '../../../save.js';
import { MAX_PLAYERS } from '../../constantes/max-players.js';
import { clean } from '../../fiches/clean.js';
import { normalize } from '../../fiches/normalize.js';

/**
 * Copie complète reçue d'un autre : pour chaque joueur, on garde la fiche
 * la plus récente, et on transmet ce qu'on vient d'apprendre à nos voisins.
 */
export function mergeIn(st, from) {
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
  // Resynchronisation d'horloge (D-166) : le plus grand clockFix l'emporte, avant l'heure de la fiche.
  const took = [];
  for (const [pid, rec] of Object.entries(incoming.players)) {
    const old = before.players[pid];
    const fix = (rec.clockFix || 0) - (old?.clockFix || 0);
    if (old && fix > 0) merged.players[pid] = { ...JSON.parse(JSON.stringify(rec)), online: old.online };
    else if (old && fix < 0) merged.players[pid] = JSON.parse(JSON.stringify(old));
    if (!old || fix > 0 || (fix === 0 && (rec.actAt || 0) > (old.actAt || 0))) took.push(pid);
  }
  for (const pid of took) this.beforeRec(pid);
  delete merged.epoch;
  delete merged.nextRank;
  this.state = merged;
  this.refreshOnline();
  for (const pid of took) {
    this.afterRec(pid);
    this.spread(merged.players[pid], null, from);
  }
  this.changed();
}
