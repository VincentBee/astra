import { HASHES } from '../hashes.js';
import { SETUPS } from '../setups.js';
import { packAddr } from './pack-addr.js';
import { Writer } from './writer.js';

export function pack(p) {
  const w = new Writer();
  w.u8(Math.max(0, SETUPS.indexOf(p.setup)));
  w.str(p.ufrag);
  w.str(p.pwd);
  w.u8(HASHES[p.hashAlg][0]);
  w.bytes(p.hash);
  const cands = p.candidates.slice(0, 12);
  w.u8(cands.length);
  for (const c of cands) {
    w.u8(c.type);
    packAddr(w, c.addr);
    w.u16(c.port);
  }
  return w.done();
}
