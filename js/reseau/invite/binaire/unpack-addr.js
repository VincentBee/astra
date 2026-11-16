import { ADDR_MDNS } from '../addr-mdns.js';
import { ADDR_TEXT } from '../addr-text.js';
import { ADDR_V4 } from '../addr-v4.js';
import { ADDR_V6 } from '../addr-v6.js';

export function unpackAddr(r) {
  const kind = r.u8();
  if (kind === ADDR_V4) return r.bytes(4).join('.');
  if (kind === ADDR_MDNS) {
    const hex = r.bytes(16).map((b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}.local`;
  }
  if (kind === ADDR_V6) {
    const g = [];
    for (let k = 0; k < 8; k++) g.push(r.u16().toString(16));
    return g.join(':');
  }
  if (kind === ADDR_TEXT) return r.str();
  throw new Error('adresse inconnue');
}
