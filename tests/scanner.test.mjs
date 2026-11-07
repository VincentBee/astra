// Lecteur de QR (#42) : « Annuler » marche à tout moment. Caméra simulée, avec des
// délais comme sur un téléphone : jsQR se charge en 300 ms, l'autorisation de la
// caméra prend 1,5 s, la vidéo démarre en 300 ms. On annule pendant chaque étape,
// puis pendant la lecture, et on vérifie que la promesse rejette avec AbortError
// et que toutes les pistes de la caméra sont éteintes (« ended ») en moins d'1 s.
// Tests simples, pas des scénarios filmés (D-129) : il n'y a ni partie ni carte à montrer,
// seulement l'API de la caméra simulée (D-250).
import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';

const JSQR_MS = 300;
const GUM_MS = 1500;
const PLAY_MS = 300;
// Sans la correction, la promesse ne se termine jamais : on borne chaque test.
const test = (name, fn) => nodeTest(name, { timeout: 8000 }, fn);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Faux navigateur : jsQR à charger, caméra lente, vidéo, canvas, images. `qrAfter` : images avant de lire un QR (Infinity : jamais). */
function fakeBrowser({ qrAfter = Infinity } = {}) {
  const tracks = [];
  let frames = 0;
  const fakeJsQR = () => (++frames >= qrAfter ? { data: 'astra:invitation' } : null);
  globalThis.window = globalThis;
  delete globalThis.jsQR;
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  globalThis.document = {
    createElement: (tag) =>
      tag === 'canvas'
        ? { getContext: () => ({ drawImage() {}, getImageData: (x, y, width, height) => ({ data: new Uint8ClampedArray(4), width, height }) }) }
        : {},
    head: {
      append: (script) =>
        setTimeout(() => {
          globalThis.jsQR = fakeJsQR;
          script.onload();
        }, JSQR_MS),
    },
  };
  const gum = { calls: 0 };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      mediaDevices: {
        getUserMedia: () => {
          gum.calls++;
          return wait(GUM_MS).then(() => {
            const t = { kind: 'video', readyState: 'live', stop() { this.readyState = 'ended'; } };
            tracks.push(t);
            return { getTracks: () => [t] };
          });
        },
      },
    },
  });
  const video = { srcObject: null, videoWidth: 640, videoHeight: 480, setAttribute() {}, play: () => wait(PLAY_MS) };
  return { tracks, gum, video, frames: () => frames };
}

let fresh = 0;
/** scanner.js neuf à chaque test : jsQR pas encore chargé. */
const load = () => import(`../js/scanner.js?t=${++fresh}`);

/** Lance un scan, annule après `ms`, et renvoie ce qu'on a vu 1 s après l'annulation. */
async function cancelAfter(ms) {
  const b = fakeBrowser();
  const { scanQr } = await load();
  const ctl = new AbortController();
  const p = scanQr(b.video, { signal: ctl.signal });
  let error = null;
  let rejectedIn = null;
  p.catch((e) => (error = e));
  await wait(ms);
  const t0 = Date.now();
  ctl.abort();
  await p.catch(() => (rejectedIn = Date.now() - t0));
  await wait(1000 - (Date.now() - t0) - 20); // juste avant 1 s
  return { ...b, error, rejectedIn, states: b.tracks.map((t) => t.readyState) };
}

test('Annuler pendant le chargement de jsQR (100 ms) : AbortError, caméra jamais allumée', async () => {
  const r = await cancelAfter(100);
  assert.equal(r.error?.name, 'AbortError');
  assert.ok(r.rejectedIn < 500, `rejet en ${r.rejectedIn} ms`);
  await wait(GUM_MS + JSQR_MS);
  assert.equal(r.gum.calls, 0, 'getUserMedia ne doit pas être appelé après Annuler');
  assert.equal(r.video.srcObject, null);
});

test("Annuler pendant la demande d'autorisation (1 s) : AbortError, le flux qui arrive après est éteint en moins d'1 s", async () => {
  const r = await cancelAfter(1000);
  assert.equal(r.error?.name, 'AbortError');
  assert.ok(r.rejectedIn < 500, `rejet en ${r.rejectedIn} ms`);
  assert.equal(r.gum.calls, 1);
  assert.deepEqual(r.states, ['ended'], 'piste arrivée 800 ms après Annuler, éteinte aussitôt');
  assert.equal(r.video.srcObject, null, 'le flux tardif ne doit pas être branché sur la vidéo');
});

test('Annuler au démarrage de la vidéo (1,9 s) : AbortError, pistes éteintes', async () => {
  const r = await cancelAfter(JSQR_MS + GUM_MS + 100);
  assert.equal(r.error?.name, 'AbortError');
  assert.ok(r.rejectedIn < 500, `rejet en ${r.rejectedIn} ms`);
  assert.deepEqual(r.states, ['ended']);
  assert.equal(r.video.srcObject, null);
});

test('Annuler pendant la lecture (après le démarrage) : AbortError, pistes éteintes, plus de lecture', async () => {
  const r = await cancelAfter(JSQR_MS + GUM_MS + PLAY_MS + 400);
  assert.equal(r.error?.name, 'AbortError');
  assert.ok(r.rejectedIn < 500, `rejet en ${r.rejectedIn} ms`);
  assert.deepEqual(r.states, ['ended']);
  assert.ok(r.frames() > 0, 'la lecture avait commencé');
  const n = r.frames();
  await wait(100);
  assert.equal(r.frames(), n, 'plus aucune image lue après Annuler');
});

test('Signal déjà annulé à l\'appel : AbortError tout de suite, rien ne démarre', async () => {
  const b = fakeBrowser();
  const { scanQr } = await load();
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(scanQr(b.video, { signal: ctl.signal }), { name: 'AbortError' });
  await wait(JSQR_MS + 50);
  assert.equal(b.gum.calls, 0);
});

test('Scan sans annulation : le texte du QR, puis la caméra s\'éteint', async () => {
  const b = fakeBrowser({ qrAfter: 3 });
  const { scanQr } = await load();
  const ctl = new AbortController();
  assert.equal(await scanQr(b.video, { signal: ctl.signal }), 'astra:invitation');
  assert.deepEqual(b.tracks.map((t) => t.readyState), ['ended']);
  ctl.abort(); // Annuler après coup ne fait rien de plus
  assert.deepEqual(b.tracks.map((t) => t.readyState), ['ended']);
});

test('Caméra refusée : message clair (pas AbortError)', async () => {
  const b = fakeBrowser();
  navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('non'), { name: 'NotAllowedError' }));
  const { scanQr } = await load();
  await assert.rejects(scanQr(b.video, { signal: new AbortController().signal }), /Accès à la caméra refusé/);
});
