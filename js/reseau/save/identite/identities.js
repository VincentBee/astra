import { ID_KEY, IDS_KEY } from '../constantes.js';
import { isMap } from '../stockage/is-map.js';
import { read } from '../stockage/read.js';

export function identities() {
  const raw = read(IDS_KEY, {});
  const ids = isMap(raw) ? raw : {};
  const cur = read(ID_KEY, null);
  if (cur?.gid && !ids[cur.gid]) ids[cur.gid] = cur;
  return ids;
}
