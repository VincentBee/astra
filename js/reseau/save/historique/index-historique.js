import { INDEX_KEY } from '../index-key.js';
import { isMap } from '../stockage/is-map.js';
import { read } from '../stockage/read.js';
import { keys } from './keys.js';
import { migrate } from './migrate.js';
import { stored } from './stored.js';

// ----- Historique : une clé par partie, et un petit index (D-415)

/** { gid: savedAt } des parties de l'historique (sans la partie en cours). */
export function index() {
  migrate();
  const raw = read(INDEX_KEY, null);
  const out = {};
  if (isMap(raw)) for (const [gid, at] of Object.entries(raw)) out[gid] = Number(at) || 0;
  // Index perdu, abîmé ou en retard : les clés présentes y sont remises (D-170).
  for (const gid of keys()) if (!(gid in out)) out[gid] = stored(gid)?.savedAt ?? 0;
  return out;
}
