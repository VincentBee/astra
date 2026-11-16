import { TYPES } from '../types.js';

/** Reconstruit un SDP valide pour un simple canal de données. */
export function buildSdp(p) {
  const PRIORITY = [2113937151, 1677729535, 1845501695, 33562623];
  const lines = [
    'v=0',
    `o=- ${Math.floor(Math.random() * 1e15)} 2 IN IP4 127.0.0.1`,
    's=-',
    't=0 0',
    'a=group:BUNDLE 0',
    'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
    'c=IN IP4 0.0.0.0',
  ];
  p.candidates.forEach((c, i) => {
    const type = TYPES[c.type] || 'host';
    const rel = type === 'host' ? '' : ' raddr 0.0.0.0 rport 0';
    lines.push(`a=candidate:${i + 1} 1 udp ${PRIORITY[c.type] - i} ${c.addr} ${c.port} typ ${type}${rel}`);
  });
  lines.push(
    `a=ice-ufrag:${p.ufrag}`,
    `a=ice-pwd:${p.pwd}`,
    `a=fingerprint:${p.hashAlg} ${p.hash.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(':')}`,
    `a=setup:${p.setup}`,
    'a=mid:0',
    'a=sctp-port:5000',
    'a=max-message-size:262144',
  );
  return lines.join('\r\n') + '\r\n';
}
