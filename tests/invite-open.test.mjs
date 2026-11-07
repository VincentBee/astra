// Invitations fermées pendant leur préparation (#70) : aucune connexion WebRTC ne doit rester
// ouverte en fond. Une fausse RTCPeerConnection compte les connexions ouvertes et fermées ; la
// préparation (collecte des adresses) dure 20 ms, le temps de fermer la fenêtre « Inviter ».
import test from 'node:test';
import assert from 'node:assert/strict';
import { Session } from './harness.mjs';

const { encode } = await import('../js/invite.js');

const FP = Array.from({ length: 32 }, (_, i) => i.toString(16).padStart(2, '0')).join(':');
const sdp = (ufrag) =>
  [
    'v=0',
    `a=ice-ufrag:${ufrag}`,
    'a=ice-pwd:abcdefghijklmnopqrstuvwx',
    `a=fingerprint:sha-256 ${FP}`,
    'a=setup:actpass',
    'a=candidate:1 1 udp 2122260223 192.168.1.10 54321 typ host',
  ].join('\r\n');

/** Toutes les fausses connexions créées ; `open()` compte celles qui ne sont pas fermées. */
const pcs = [];
const open = () => pcs.filter((pc) => pc.signalingState !== 'closed').length;

class FakeChannel extends EventTarget {
  readyState = 'connecting';
  send() {}
  close() {}
}

class FakePC extends EventTarget {
  constructor() {
    super();
    this.signalingState = 'stable';
    this.iceGatheringState = 'new';
    this.connectionState = 'new';
    this.localDescription = null;
    pcs.push(this);
  }
  createDataChannel() {
    return (this.channel = new FakeChannel());
  }
  async createOffer() {
    return { type: 'offer', sdp: sdp(`host${pcs.length}`) };
  }
  async setLocalDescription(d) {
    this.localDescription = d;
    this.signalingState = 'have-local-offer';
    setTimeout(() => {
      this.iceGatheringState = 'complete';
      this.dispatchEvent(new Event('icegatheringstatechange'));
    }, 20);
  }
  async setRemoteDescription() {
    if (this.signalingState === 'closed') throw new Error('fermée');
    this.signalingState = 'stable';
    // L'invité a scanné : le canal s'ouvre un peu plus tard.
    setTimeout(() => {
      this.channel.readyState = 'open';
      this.channel.dispatchEvent(new Event('open'));
    }, 5);
  }
  close() {
    this.signalingState = 'closed';
  }
}
globalThis.RTCPeerConnection = FakePC;

// Le délai de 25 s de la connexion (js/peer.js, withTimeout) n'est jamais annulé : on ne le laisse
// pas retenir Node 25 s après la fin du test.
const st = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms, ...a) => {
  const t = st(fn, ms, ...a);
  if (ms >= 10000) t.unref?.();
  return t;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test.beforeEach(() => (pcs.length = 0));

test('fermer « Inviter » avant le QR ferme la connexion de cette invitation', async () => {
  const s = new Session('A');
  const pending = s.openInvite(); // la fenêtre s'ouvre…
  s.cancelInvite(); // …et se ferme avant que le QR soit prêt
  assert.equal(await pending, null);
  console.log(`  1 ouverture/fermeture : créées ${pcs.length}, encore ouvertes ${open()}, session.invite ${s.invite}`);
  assert.equal(pcs.length, 1);
  assert.equal(open(), 0);
  assert.equal(s.invite, null);
});

test('5 ouvertures/fermetures très rapides : 0 connexion orpheline', async () => {
  const s = new Session('A');
  const all = [];
  for (let i = 0; i < 5; i++) {
    all.push(s.openInvite());
    s.cancelInvite();
  }
  assert.deepEqual(await Promise.all(all), [null, null, null, null, null]);
  console.log(`  5 ouvertures/fermetures : créées ${pcs.length}, encore ouvertes ${open()}`);
  assert.equal(pcs.length, 5);
  assert.equal(open(), 0);
  assert.equal(s.invite, null);
});

test('rouvrir vite sans fermer : seule la dernière invitation reste ouverte, et la fin de partie la ferme', async () => {
  const s = new Session('A');
  const codes = await Promise.all([s.openInvite(), s.openInvite(), s.openInvite()]);
  console.log(`  3 ouvertures d'affilée : codes ${codes.map((c) => (c ? 'oui' : 'null')).join(', ')} ; encore ouvertes ${open()}`);
  assert.deepEqual(codes.map(Boolean), [false, false, true]);
  assert.equal(open(), 1);
  assert.equal(s.invite.code, codes[2]);
  s.cancelInvite(); // ce que fait session.end()
  assert.equal(open(), 0);
});

test('une invitation normale, scannée par un autre joueur, se connecte comme avant', async () => {
  const s = new Session('A');
  s.attach = (link) => (s.attached = link); // on regarde seulement le lien remis à la session
  const code = await s.openInvite();
  assert.match(code, /^o2\./);
  const answer = await encode('a', sdp('guest'));
  const link = await s.acceptAnswer(answer);
  // Après coup, fermer la fenêtre ou rouvrir une invitation ne touche pas la connexion acceptée.
  s.cancelInvite();
  await s.openInvite();
  s.cancelInvite();
  console.log(`  invitation acceptée : lien ${link === s.attached ? 'remis' : 'absent'}, sa connexion ${link.pc.signalingState}, autres ouvertes ${open() - 1}`);
  assert.equal(s.attached, link);
  assert.notEqual(link.pc.signalingState, 'closed');
  assert.equal(open(), 1);
  await wait(0);
});
