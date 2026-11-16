import { ADDR_MDNS } from '../addr-mdns.js';
import { ADDR_TEXT } from '../addr-text.js';
import { ADDR_V4 } from '../addr-v4.js';
import { ADDR_V6 } from '../addr-v6.js';

export function packAddr(w, addr) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(addr)) {
    w.u8(ADDR_V4);
    w.bytes(addr.split('.').map(Number));
  } else if (/^[0-9a-f-]{36}\.local$/i.test(addr)) {
    w.u8(ADDR_MDNS);
    w.bytes(addr.slice(0, 36).replace(/-/g, '').match(/../g).map((h) => parseInt(h, 16)));
  } else if (addr.includes(':')) {
    w.u8(ADDR_V6);
    const [head, tail] = addr.split('::');
    const h = head ? head.split(':') : [];
    const t = tail !== undefined ? (tail ? tail.split(':') : []) : [];
    const groups = tail !== undefined ? [...h, ...Array(8 - h.length - t.length).fill('0'), ...t] : h;
    for (const g of groups) w.u16(parseInt(g || '0', 16));
  } else {
    w.u8(ADDR_TEXT);
    w.str(addr);
  }
}
