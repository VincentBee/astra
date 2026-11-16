import { etat } from '../etat.js';
import { GAME_KEY } from '../game-key.js';
import { INDEX_KEY } from '../index-key.js';
import { KEEP } from '../keep.js';
import { OLD_KEY } from '../old-key.js';
import { SAVE_KEY } from '../save-key.js';
import { isMap } from '../stockage/is-map.js';
import { read } from '../stockage/read.js';
import { remove } from '../stockage/remove.js';
import { valid } from '../stockage/valid.js';
import { write } from '../stockage/write.js';

/**
 * Reprise de l'ancien format (avant D-415) : `astra.saves` contenait tout l'historique, partie
 * en cours comprise. On le lit, on l'efface d'abord (sinon la place manque pour recopier), puis
 * chaque partie reçoit sa clé, la plus récente d'abord. Les entrées abîmées sont laissées (D-170).
 */
export function migrate() {
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
  let lost = 0;
  // L'ancien format écrivait deux copies : on garde la plus récente (sinon `astra.save` reste, plus ancien).
  if (fresher && !write(SAVE_KEY, fresher)) lost++;
  const idx = {};
  const prev = read(INDEX_KEY, {});
  if (isMap(prev)) Object.assign(idx, prev);
  for (const s of list.sort((a, b) => b.savedAt - a.savedAt)) {
    if (s.state.gid in idx || Object.keys(idx).length >= KEEP - 1) continue;
    // Tenait avant : n'arrive pas en pratique. Sinon on essaie les suivantes, et on prévient.
    if (write(GAME_KEY + s.state.gid, s)) idx[s.state.gid] = s.savedAt;
    else lost++;
  }
  write(INDEX_KEY, idx);
  if (lost) {
    try {
      etat.failed?.('history', lost);
    } catch {}
  }
}
