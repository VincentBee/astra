import { HASH_BY_ID } from '../hash-by-id.js';
import { HASHES } from '../hashes.js';
import { SETUPS } from '../setups.js';
import { Reader } from './reader.js';
import { unpackAddr } from './unpack-addr.js';

export function unpack(bytes) {
  const r = new Reader(bytes);
  const setup = SETUPS[r.u8()] || 'actpass';
  const ufrag = r.str();
  const pwd = r.str();
  const hashAlg = HASH_BY_ID[r.u8()];
  if (!hashAlg) throw new Error('empreinte inconnue');
  const hash = r.bytes(HASHES[hashAlg][1]);
  const n = r.u8();
  const candidates = [];
  for (let k = 0; k < n; k++) {
    const type = r.u8();
    const addr = unpackAddr(r);
    candidates.push({ type, addr, port: r.u16() });
  }
  // Ces textes finissent dans la description réseau, ligne par ligne : pas de retour à la ligne caché.
  const ice = /^[A-Za-z0-9+/]{1,256}$/;
  if (!ice.test(ufrag) || !ice.test(pwd)) throw new Error('identifiants réseau invalides');
  if (candidates.some((c) => !/^[A-Za-z0-9.:-]{1,253}$/.test(String(c.addr)))) throw new Error('adresse invalide');
  return { setup, ufrag, pwd, hashAlg, hash, candidates };
}
