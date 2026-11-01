// Bouton « Voir la planète » de la fiche de planète sur la carte (D-138, D-139) : il n'apparaît
// que sur mes planètes, mère ou colonie. La règle est `Session.myPlanetAt`, celle que lit
// `renderPick` (js/app.js).
//
// En scénario (D-129) : chaque image du rapport tests/reports/planet-button.test.html montre la
// planète touchée (anneau blanc) et, sous la carte, sa fiche avec ou sans le bouton.
// Pour le voir même quand tout passe : ASTRA_REPORT=1 node --test tests/planet-button.test.mjs
import assert from 'node:assert/strict';
import { newGame, game, fleet } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

scenario('« Voir la planète » : sur ma planète, pas sur celle d’un autre ni sur une libre, puis sur ma nouvelle colonie', (film) => {
  const { players: [A, B], clock, sync } = newGame(2, ['human', 'human']);
  sync(A, B);
  const home = { ...P(A).home };
  // La planète libre la plus proche de ma planète mère : elle deviendra ma colonie.
  const free = A.planets
    .filter((w) => w.kind === 'planet' && !A.ownerAt(w) && A.frostOf(w) > clock.t)
    .sort((a, b) => Math.hypot(a.x - home.x, a.y - home.y) - Math.hypot(b.x - home.x, b.y - home.y))[0];
  const target = { x: free.x, y: free.y };

  film.look(A, 'A touche sa planète mère', [{ sheet: home, button: true }]);
  film.look(A, 'A touche la planète mère de B', [{ sheet: P(B).home, button: false }]);
  film.look(A, 'A touche une planète libre', [{ sheet: target, button: false }]);

  // A y envoie un colonisateur ; son téléphone règle l'arrivée (tick), seconde par seconde.
  const pl = P(A).planet;
  Object.assign(pl, { ships: { colony: 1 }, stock: { ...pl.stock, energy: 900 } });
  const id = A.takeOff('home', { colony: 1 }, {}, fleet.fleetTank('human', { colony: 1 })); // le plein
  assert.ok(id, 'décollage accepté');
  assert.ok(A.moveFleet(id, target, 'colonize'), 'départ du colonisateur accepté');
  film.look(A, 'le colonisateur part, la planète est encore libre', [{ sheet: target, button: false }]);
  film.roll(A, clock, A.myFleet(id).arrive + 1000, 'le colonisateur en route', () => A.tick());

  assert.ok(P(A).colonies[free.id], 'A a fondé sa colonie');
  film.look(A, 'colonie fondée : A la touche', [{ sheet: target, button: true }]);
  assert.equal(A.myPlanetAt(target).key, free.id, 'le bouton ouvre cette colonie, pas la planète mère');
  assert.equal(game.sameCell(A.myPlanetAt(home).cell, home), true);
});
