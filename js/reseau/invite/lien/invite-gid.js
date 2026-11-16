import { GID_OK } from './gid-ok.js';

/** La partie d'où vient une invitation (`?g=` avant le "#"), ou null : ancien lien, code seul. */
export function inviteGid(input) {
  const text = String(input || '').trim();
  const hash = text.indexOf('#');
  const m = /[?&]g=([^&#]*)/.exec(hash >= 0 ? text.slice(0, hash) : '');
  return m && GID_OK.test(m[1]) ? m[1] : null;
}
