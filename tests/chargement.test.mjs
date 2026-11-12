// Un chargement raté ne reste pas raté (#86, D-510, D-511). Réseau coupé au premier chargement de
// jsQR (lecteur de QR) ou de Trystero (rendez-vous), puis réseau revenu : le second essai refait
// la requête et marche. Tests simples, pas des scénarios filmés (D-129) : il n'y a rien de la
// partie à montrer, seulement des requêtes de fichiers.
//
// Trystero est remplacé par un faux module, servi par un crochet de chargement de Node
// (module.registerHooks) qui compte les requêtes et peut les faire échouer, comme une coupure.
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { newGame, Session } from './harness.mjs';

const test = (name, fn) => nodeTest(name, { timeout: 8000 }, fn);

// ----- faux réseau pour Trystero

const net = { down: false, urls: [] };
const FAKE_TRYSTERO = `export function joinRoom() {
  return { makeAction: () => ({ send() {}, onMessage: null }), leave() {}, getPeers: () => ({}) };
}`;
registerHooks({
  load(url, context, next) {
    if (!url.includes('/vendor/trystero-nostr.mjs')) return next(url, context);
    net.urls.push(url.slice(url.indexOf('/vendor/')));
    if (net.down) throw new TypeError('Failed to fetch dynamically imported module: ' + url);
    return { format: 'module', source: FAKE_TRYSTERO, shortCircuit: true };
  },
});

test('Partie : un rendez-vous raté est retenté tout seul (battement de cœur), puis toutes les 15 s au plus', async () => {
  const { players: [A] } = newGame(2);
  net.down = true;
  Session.prototype.meet.call(A); // le vrai meet() (le harnais le neutralise)
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(A.rdv.state, 'failed');
  const before = net.urls.length;
  A.retryRendezvous(1000); // encore coupé : nouvel essai, raté
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(net.urls.length, before + 1, 'un essai');
  assert.equal(A.rdv.state, 'failed');
  net.down = false;
  A.retryRendezvous(1000 + 5000); // 5 s après : trop tôt
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(net.urls.length, before + 1, 'pas de nouvel essai avant 15 s');
  A.retryRendezvous(1000 + 15000);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(A.rdv.state, 'on', 'réseau revenu : le rendez-vous marche');
  const after = net.urls.length;
  A.heartbeat(); // rendez-vous en marche : le battement ne le relance pas
  assert.equal(net.urls.length, after);
  A.rdv.leave();
});

test('Rendez-vous : raté réseau coupé, réussi au nouvel essai, à une autre adresse', async () => {
  net.down = true;
  net.urls.length = 0;
  // rendezvous.js neuf : celui de session.js a déjà chargé Trystero au test d'avant.
  const { Rendezvous } = await import('../js/rendezvous.js?t=2');
  const rdv = new Rendezvous({ gid: 'g1', key: 'k', me: 'moi', onLink() {} });
  await rdv.join();
  assert.equal(rdv.state, 'failed');
  net.down = false;
  await rdv.refresh();
  assert.equal(rdv.state, 'on', 'réseau revenu : le rendez-vous marche');
  assert.deepEqual(net.urls, ['/vendor/trystero-nostr.mjs', '/vendor/trystero-nostr.mjs?r=1'], 'une nouvelle requête, à une autre adresse');
  rdv.leave();
});

// ----- lecteur de QR

test('Lecteur de QR : jsQR raté réseau coupé, rechargé au nouvel appui sur Scanner', async () => {
  const appended = [];
  let down = true;
  globalThis.window = globalThis;
  delete globalThis.jsQR;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  const realDocument = globalThis.document;
  globalThis.document = {
    ...realDocument,
    createElement: (tag) =>
      tag === 'canvas' ? { getContext: () => ({ drawImage() {}, getImageData: (x, y, width, height) => ({ data: new Uint8ClampedArray(4), width, height }) }) } : {},
    head: {
      append: (script) => {
        appended.push(script.src);
        setTimeout(() => {
          if (down) return script.onerror();
          globalThis.jsQR = () => ({ data: 'astra:invitation' });
          script.onload();
        }, 10);
      },
    },
  };
  const t = { readyState: 'live', stop() { this.readyState = 'ended'; } };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [t] }) } },
  });
  const video = { srcObject: null, videoWidth: 640, videoHeight: 480, setAttribute() {}, play: async () => {} };
  try {
    const { scanQr } = await import('../js/scanner.js');
    await assert.rejects(scanQr(video), /Lecteur de QR introuvable/);
    down = false;
    assert.equal(await scanQr(video), 'astra:invitation', 'réseau revenu : le scanner lit le QR');
    assert.equal(appended.length, 2, 'une nouvelle requête vers jsQR.js');
  } finally {
    globalThis.document = realDocument;
  }
});
