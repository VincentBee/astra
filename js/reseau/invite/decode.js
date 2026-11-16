import { fromB64url } from './base64/from-b64url.js';
import { unpack } from './binaire/unpack.js';
import { VERSION } from './constantes.js';
import { buildSdp } from './sdp/build-sdp.js';

/**
 * Accepte un code brut ou un lien complet contenant "#…".
 * Renvoie { kind, sdp } ou lève une erreur lisible.
 */
export async function decode(input) {
  let text = String(input || '').trim();
  const hash = text.indexOf('#');
  if (hash >= 0) text = text.slice(hash + 1);
  const m = /^([oa])(\d)\.([A-Za-z0-9_-]+)$/.exec(text);
  if (!m) throw new Error("Ce code n'est pas une invitation Astra.");
  if (m[2] !== VERSION) throw new Error("Invitation créée avec une autre version de l'appli. Recharge la page des deux côtés.");
  try {
    return { kind: m[1], sdp: buildSdp(unpack(fromB64url(m[3]))) };
  } catch {
    throw new Error('Code incomplet ou abîmé. Rescanne-le ou recopie-le en entier.');
  }
}
