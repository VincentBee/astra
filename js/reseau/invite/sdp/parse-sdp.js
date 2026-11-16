import { HASHES } from '../hashes.js';
import { TYPES } from '../types.js';

// ----- lecture du SDP -------------------------------------------------------

export function parseSdp(sdp) {
  const out = { candidates: [] };
  for (const line of sdp.split(/\r?\n/)) {
    if (line.startsWith('a=ice-ufrag:')) out.ufrag = line.slice(12);
    else if (line.startsWith('a=ice-pwd:')) out.pwd = line.slice(10);
    else if (line.startsWith('a=setup:')) out.setup = line.slice(8);
    else if (line.startsWith('a=fingerprint:')) {
      const [alg, hex] = line.slice(14).split(' ');
      out.hashAlg = alg.toLowerCase();
      out.hash = hex.split(':').map((h) => parseInt(h, 16));
    } else if (line.startsWith('a=candidate:')) {
      // a=candidate:<foundation> <component> <transport> <priority> <addr> <port> typ <type> …
      const f = line.slice(12).split(' ');
      if (f[1] !== '1' || f[2].toLowerCase() !== 'udp') continue; // UDP, composant 1 seulement
      const type = TYPES.indexOf(f[7]);
      if (type < 0) continue;
      out.candidates.push({ addr: f[4], port: Number(f[5]), type });
    }
  }
  if (!out.ufrag || !out.pwd || !out.hash || !HASHES[out.hashAlg]) throw new Error('Description réseau illisible.');
  return out;
}
