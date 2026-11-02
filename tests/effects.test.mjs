// Rapports de combat entre téléphones : chaque rapport est appliqué une fois
// et une seule par sa cible, quel que soit le nombre d'attaquants et de
// combats, puis oublié des deux côtés.
import assert from 'node:assert/strict';
import { newGame } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

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

scenario('5 joueurs, 4 attaquants × 70 combats : chaque perte subie une seule fois', (film) => {
  const { players, clock, sync } = newGame(5);
  const [D, ...attackers] = players;
  D.state.players[D.me].planet.ships = { fighter: 1000 };
  strike(attackers, D, 70, clock);
  for (const a of attackers) sync(D, a);
  film.look(D, 'D (1000 drones) reçoit 4 × 70 rapports « 1 drone détruit »');
  for (let i = 0; i < 20; i++) {
    clock.t += 250;
    D.tick();
    if (i % 5 === 4) film.look(D, `D applique les rapports (${(i + 1) / 4} s)`, i === 19 ? [{ show: 'drones de D', at: D.state.players[D.me].home, expected: 1000 - 4 * 70, got: fighters(D) }] : []);
  }
  assert.equal(fighters(D), 1000 - 4 * 70, 'chaque rapport appliqué exactement une fois');

  // Les attaquants voient que D a tout appliqué : ils oublient leurs rapports.
  for (const a of attackers) {
    sync(a, D);
    a.tick();
    assert.equal(a.state.players[a.me].effects.length, 0);
  }
  film.look(D, 'les attaquants ont vu que D a tout appliqué : ils oublient leurs rapports', [{ show: 'rapports gardés par les attaquants', expected: 0, got: attackers.reduce((t, a) => t + a.state.players[a.me].effects.length, 0) }]);
  // D le voit à son tour : il oublie la liste des rapports appliqués, sans rien réappliquer.
  for (const a of attackers) sync(D, a);
  for (let i = 0; i < 20; i++) {
    clock.t += 250;
    D.tick();
  }
  film.look(D, 'D oublie la liste des rapports appliqués, sans rien réappliquer', [
    { show: 'rapports appliqués retenus', expected: 0, got: D.state.players[D.me].applied.length },
    { show: 'drones de D', at: D.state.players[D.me].home, expected: 1000 - 4 * 70, got: fighters(D) },
  ]);
  assert.equal(D.state.players[D.me].applied.length, 0);
  assert.equal(fighters(D), 1000 - 4 * 70);
});
