import { GID_OK } from './gid-ok.js';

/**
 * Lien d'invitation : l'appli s'ouvre directement sur l'écran « rejoindre ».
 * `gid` (D-260) dit de quelle partie vient l'invitation, dans `?g=` avant le "#" :
 * l'invité n'envoie que son identité de cette partie. Un ancien téléphone l'ignore.
 */
export function inviteLink(code, gid) {
  const g = typeof gid === 'string' && GID_OK.test(gid) ? `?g=${gid}` : '';
  return `${location.origin}${location.pathname}${g}#${code}`;
}
