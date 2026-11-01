// Alerte de flotte ennemie (D-133) : ce que Session.threats signale au
// défenseur, et ce qu'elle tait (flottes sans armes, hors de vue, les miennes).
//
// Écrits en scénarios (D-129) : chaque image du rapport tests/reports/threat.test.html
// montre la carte vue par A et, au-dessus, son bandeau d'alerte tel que le jeu l'écrit
// (`threatText`). Pour le voir même quand tout passe : ASTRA_REPORT=1 node --test tests/threat.test.mjs
import assert from 'node:assert/strict';
import { newGame, game } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);
const P = (s) => s.state.players[s.me];

/** Une flotte de `s`, arrêtée en `at`, le plein fait. */
function park(s, ships, at) {
  const pl = P(s).planet;
  pl.ships = { ...ships };
  pl.stock = { ...pl.stock, energy: 5000 };
  const id = s.takeOff('home', ships, {}, 0);
  Object.assign(s.myFleet(id), { from: { ...at }, to: { ...at }, fuel: 1000 });
  s.touch();
  return id;
}

/** `n` humains ; `at(dx, dy)` : la case à dx, dy de la planète mère de A, du côté où la carte a la place. */
function duel(n = 2) {
  const g = newGame(n, Array(n).fill('human'));
  const home = { ...P(g.players[0]).home };
  const sx = home.x < game.UNIVERSE.w / 2 ? 1 : -1;
  const sy = home.y < game.UNIVERSE.h / 2 ? 1 : -1;
  return { ...g, home, at: (dx, dy = 0) => ({ x: home.x + sx * dx, y: home.y + sy * dy }) };
}

scenario('une flotte armée part conquérir ma planète : bandeau rouge et compte à rebours jusqu’à l’impact', (film) => {
  const { players: [A, B], clock, sync, home, at } = duel();
  const name = A.planetsOf(P(A))[0].name;
  sync(B, A); // B connaît la planète de A
  const id = park(B, { fighter: 4 }, at(3));
  sync(A, B);
  film.look(A, 'B attend à 3 cases, sans ordre', [{ fleet: [B, id], visible: true }, { alert: /^4 vaisseaux de J1 en vue, à 3 cases/ }]);

  assert.ok(B.moveFleet(id, home, 'conquer'));
  sync(A, B);
  const arrive = P(B).fleets.find((f) => f.id === id).arrive;
  const secs = Math.ceil((arrive - clock.t) / 1000);
  film.look(A, 'B lance la conquête', [{ alert: new RegExp(`^4 vaisseaux de J1 sur ${name} dans ${secs} s$`) }]);

  // Chaque seconde, A reçoit la fiche de B et son bandeau décompte. B ne règle pas encore l'arrivée (téléphone en veille).
  film.roll(A, clock, arrive - 1000, 'B en route', () => sync(A, B));
  film.look(A, 'une seconde avant l’impact', [{ alert: new RegExp(`sur ${name} dans 1 s$`) }]);

  clock.t = arrive + 3000;
  film.look(A, 'arrivée, combat pas encore réglé', [{ alert: new RegExp(`^4 vaisseaux de J1 en orbite (de |d’)${name}$`) }]);
});

scenario('une menace directe passe avant une flotte qui rôde : « +1 autre »', (film) => {
  const { players: [A, B, C], clock, sync, home, at } = duel(3);
  const name = A.planetsOf(P(A))[0].name;
  sync(B, A);
  const lurk = park(C, { fighter: 1 }, at(1, 1)); // tout près, mais ne vise rien
  const raid = park(B, { fighter: 2 }, at(2));
  assert.ok(B.moveFleet(raid, home, 'attack'));
  sync(A, B);
  sync(A, C);
  film.look(A, 'B attaque, C rôde', [
    { fleet: [B, raid], visible: true },
    { fleet: [C, lurk], visible: true },
    { alert: new RegExp(`^2 vaisseaux de J1 sur ${name} dans \\d+ s · \\+1 autre$`) },
  ]);
  const list = A.threats(clock.t);
  assert.deepEqual(list.map((t) => t.p.id), [B.me, C.me]);
  assert.equal(list[1].eta, null, 'C ne vise rien : pas de compte à rebours');
});

scenario('pas d’alerte pour une flotte sans armes, hors de vue, ou à moi', (film) => {
  const { players: [A, B], sync, at } = duel();
  const mine = park(A, { fighter: 3 }, at(1));
  const cargo = park(B, { cargo: 2 }, at(1, 1));
  sync(A, B);
  P(B).planet.ships = { fighter: 2 };
  const far = B.takeOff('home', { fighter: 2 }, {}, 0); // en orbite de la planète de B, loin
  B.touch();
  sync(A, B);
  film.look(A, 'un cargo de B tout près, des chasseurs de B très loin', [
    { fleet: [A, mine], visible: true },
    { fleet: [B, cargo], visible: true },
    { fleet: [B, far], visible: false },
    { alert: null },
  ]);
});
