import { LocalLink } from './local-link.js';

export function localPair() {
  const a = new LocalLink();
  const b = new LocalLink();
  a.peer = b;
  b.peer = a;
  return [a, b];
}
