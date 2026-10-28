// Gros messages (copie complète d'une partie avec ses journaux) : envoyés en
// morceaux sous la limite de taille, recollés à l'identique à l'arrivée.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { Link } = await import('../js/peer.js');

/** Deux bouts d'un canal en mémoire ; `sent` garde la taille de chaque envoi. */
function pair() {
  const sent = [];
  const a = { readyState: 'open', send: (t) => (sent.push(t.length), b.onmessage?.({ data: t })) };
  const b = { readyState: 'open', send() {} };
  const pc = { addEventListener() {} };
  return { from: new Link(pc, a), to: new Link(pc, b), sent };
}

test('un message de 600 000 caractères arrive entier, en morceaux de moins de 64 000', () => {
  const { from, to, sent } = pair();
  const got = [];
  to.onmessage = (m) => got.push(m);
  const big = { type: 'welcome', state: { text: 'é'.repeat(600_000) } };
  from.send({ type: 'ping' });
  from.send(big);
  assert.deepEqual(got, [{ type: 'ping' }, big]);
  assert.ok(sent.length > 10 && sent.every((n) => n < 64_000), `envois : ${sent}`);
});
