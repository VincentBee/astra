// Rapports de combat entre téléphones : chaque rapport est appliqué une fois
// et une seule par sa cible, quel que soit le nombre d'attaquants et de
// combats, puis oublié des deux côtés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';

/** Chaque attaquant inscrit `count` rapports « 1 drone détruit » visant la planète mère de `target`. */
function strike(attackers, target, count, clock) {
  for (const a of attackers) {
    const p = a.state.players[a.me];
    for (let i = 0; i < count; i++) {
      p.effects = [...(p.effects || []), { id: `${a.me}-${i}`, to: target.me, key: 'home', at: clock.t, ships: { fighter: 1 }, take: {} }];
    }
    a.touch();
  }
}

const fighters = (s) => s.state.players[s.me].planet.ships.fighter;

test('5 joueurs, 4 attaquants × 70 combats : chaque perte subie une seule fois', () => {
  const { players, clock, sync } = newGame(5);
  const [D, ...attackers] = players;
  D.state.players[D.me].planet.ships = { fighter: 1000 };
  strike(attackers, D, 70, clock);
  for (const a of attackers) sync(D, a);
  for (let i = 0; i < 20; i++) {
    clock.t += 250;
    D.tick();
  }
  assert.equal(fighters(D), 1000 - 4 * 70, 'chaque rapport appliqué exactement une fois');

  // Les attaquants voient que D a tout appliqué : ils oublient leurs rapports.
  for (const a of attackers) {
    sync(a, D);
    a.tick();
    assert.equal(a.state.players[a.me].effects.length, 0);
  }
  // D le voit à son tour : il oublie la liste des rapports appliqués, sans rien réappliquer.
  for (const a of attackers) sync(D, a);
  for (let i = 0; i < 20; i++) {
    clock.t += 250;
    D.tick();
  }
  assert.equal(D.state.players[D.me].applied.length, 0);
  assert.equal(fighters(D), 1000 - 4 * 70);
});
