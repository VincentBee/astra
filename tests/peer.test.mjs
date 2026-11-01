// Gros messages (copie complète d'une partie avec ses journaux) : envoyés en
// morceaux sous la limite de taille, recollés à l'identique à l'arrivée.
//
// En scénario (D-129) : le gros message est la copie de la partie de A (alourdie d'un long texte)
// envoyée à un nouveau venu B, qui la fusionne ; l'image montre la partie chez B à l'arrivée.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const { Link } = await import('../js/peer.js');
const scenario = scenarios(import.meta.url);

/** Deux bouts d'un canal en mémoire ; `sent` garde la taille de chaque envoi. */
function pair() {
  const sent = [];
  const a = { readyState: 'open', send: (t) => (sent.push(t.length), b.onmessage?.({ data: t })) };
  const b = { readyState: 'open', send() {} };
  const pc = { addEventListener() {} };
  return { from: new Link(pc, a), to: new Link(pc, b), sent };
}

scenario('un message de 600 000 caractères arrive entier, en morceaux de moins de 64 000', (film) => {
  const { players: [A, B] } = newGame(2);
  // B ne connaît pas encore A : il ne saura de lui que ce que le gros message apporte.
  delete B.state.players[A.me];
  film.look(B, 'B attend la copie de la partie de A');
  const { from, to, sent } = pair();
  const got = [];
  to.onmessage = (m) => got.push(m);
  const big = { type: 'welcome', state: { ...A.snapshot(), text: 'é'.repeat(600_000) } };
  from.send({ type: 'ping' });
  from.send(big);
  assert.deepEqual(got, [{ type: 'ping' }, big]);
  assert.ok(sent.length > 10 && sent.every((n) => n < 64_000), `envois : ${sent}`);
  B.mergeIn(got[1].state, { pid: A.me });
  film.look(B, 'la copie de A est arrivée entière : B voit A et sa planète');
});
