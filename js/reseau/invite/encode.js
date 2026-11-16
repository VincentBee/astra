import { toB64url } from './base64/to-b64url.js';
import { pack } from './binaire/pack.js';
import { VERSION } from './constantes.js';
import { parseSdp } from './sdp/parse-sdp.js';

// ----- API -------------------------------------------------------------------

export async function encode(kind, sdp) {
  return `${kind}${VERSION}.${toB64url(pack(parseSdp(sdp)))}`;
}
