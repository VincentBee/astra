import { identities } from './identities.js';

/** Mon identité dans la partie `gid` (en cours ou gardée), ou null (D-260). */
export function identityFor(gid) {
  const ids = identities();
  const id = Object.hasOwn(ids, gid) ? ids[gid] : null;
  return id?.gid === gid ? id : null;
}
