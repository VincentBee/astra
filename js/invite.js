// Transforme une description WebRTC (offre ou réponse) en code court
// transportable par QR code ou par lien, et inversement.
//
// Une description SDP fait 500 à 1 000 caractères, dont l'essentiel est
// prévisible. On n'en garde que ce qui varie (identifiants ICE, empreinte
// DTLS, rôle, adresses), packé en binaire puis en base64url : environ 150
// caractères, soit un QR code assez simple pour être lu d'un écran à l'autre.
// Le SDP complet est reconstruit à l'arrivée.
//
// Format du code : "<o|a>2.<base64url>"  (o = offre du MJ, a = réponse du joueur)
// Le lien d'invitation met ce code après le "#", qui n'est jamais envoyé au
// site qui héberge l'appli.

import qrcode from '../vendor/qrcode.mjs';

const VERSION = '2';
const SETUPS = ['actpass', 'active', 'passive'];
const TYPES = ['host', 'srflx', 'prflx', 'relay'];
const HASHES = { 'sha-256': [1, 32], 'sha-384': [2, 48], 'sha-512': [3, 64] };
const HASH_BY_ID = { 1: 'sha-256', 2: 'sha-384', 3: 'sha-512' };
const ADDR_V4 = 0, ADDR_V6 = 1, ADDR_MDNS = 2, ADDR_TEXT = 3;

// ----- lecture du SDP -------------------------------------------------------

function parseSdp(sdp) {
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

// ----- binaire ---------------------------------------------------------------

class Writer {
  constructor() { this.b = []; }
  u8(v) { this.b.push(v & 255); }
  u16(v) { this.u8(v >> 8); this.u8(v); }
  bytes(a) { for (const v of a) this.u8(v); }
  str(s) { const e = new TextEncoder().encode(s); this.u8(e.length); this.bytes(e); }
  done() { return Uint8Array.from(this.b); }
}

class Reader {
  constructor(b) { this.b = b; this.i = 0; }
  u8() { if (this.i >= this.b.length) throw new Error('trop court'); return this.b[this.i++]; }
  u16() { return (this.u8() << 8) | this.u8(); }
  bytes(n) { const out = []; for (let k = 0; k < n; k++) out.push(this.u8()); return out; }
  str() { return new TextDecoder().decode(Uint8Array.from(this.bytes(this.u8()))); }
}

function packAddr(w, addr) {
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

function unpackAddr(r) {
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

function pack(p) {
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

function unpack(bytes) {
  const r = new Reader(bytes);
  const setup = SETUPS[r.u8()] || 'actpass';
  const ufrag = r.str();
  const pwd = r.str();
  const hashAlg = HASH_BY_ID[r.u8()];
  if (!hashAlg) throw new Error('empreinte inconnue');
  const hash = r.bytes(HASHES[hashAlg][1]);
  const n = r.u8();
  const candidates = [];
  for (let k = 0; k < n; k++) {
    const type = r.u8();
    const addr = unpackAddr(r);
    candidates.push({ type, addr, port: r.u16() });
  }
  return { setup, ufrag, pwd, hashAlg, hash, candidates };
}

/** Reconstruit un SDP valide pour un simple canal de données. */
function buildSdp(p) {
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

// ----- base64url -------------------------------------------------------------

function toB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text) {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

// ----- API -------------------------------------------------------------------

export async function encode(kind, sdp) {
  return `${kind}${VERSION}.${toB64url(pack(parseSdp(sdp)))}`;
}

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

/** Lien d'invitation : l'appli s'ouvre directement sur l'écran « rejoindre ». */
export function inviteLink(code) {
  return `${location.origin}${location.pathname}#${code}`;
}

/** Dessine `text` en QR code dans un <canvas>, en pixels nets. */
export function drawQr(canvas, text) {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  const quiet = 4;
  const size = count + quiet * 2;
  const scale = Math.max(4, Math.floor(640 / size));
  canvas.width = canvas.height = size * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
    }
  }
  return count;
}
