// Fiches venues d'un pair malveillant ou abîmées : elles ne doivent ni faire
// planter les autres téléphones, ni réécrire la fiche de quelqu'un d'autre.
// Cas trouvés en faisant jouer un robot tricheur.
//
// Écrits en scénarios (D-129) : en cas d'échec, le rapport tests/reports/hostile.test.html
// montre la partie vue par le joueur visé, avant et après la fiche trafiquée.
import assert from 'node:assert/strict';
import { newGame, game, clone } from './harness.mjs';
import { scenarios } from './scenario.mjs';

const scenario = scenarios(import.meta.url);

const P = (s) => s.state.players[s.me];

/** Le tricheur `b` envoie à `a` sa copie, retouchée par `edit`. */
function forge(a, b, edit) {
  const st = clone(b.snapshot());
  edit(st);
  a.mergeIn(st, { pid: b.me });
}

scenario('personne ne réécrit ma fiche ni le secret d’un autre, ni ne date sa fiche loin dans le futur', (film) => {
  const { players: [A, B, C], clock } = newGame(3);
  const hashC = A.state.players[C.me].secretHash;
  film.look(A, 'au départ, trois joueurs');
  forge(A, B, (st) => {
    Object.assign(st.players[A.me], { name: 'Volé', actAt: clock.t + 60_000 });
    Object.assign(st.players[C.me], { secretHash: 'f'.repeat(64), actAt: clock.t + 60_000 });
    st.players[B.me].actAt = 1e17;
  });
  film.look(A, 'A reçoit la fiche trafiquée de B (nom de A, secret de C, date de B) : rien ne passe', [
    { show: 'nom de A', at: P(A).home, expected: 'J0', got: P(A).name },
    { show: 'secret de C', at: A.state.players[C.me].home, expected: 'inchangé', got: A.state.players[C.me].secretHash === hashC ? 'inchangé' : 'changé' },
    { show: 'date de B', at: A.state.players[B.me].home, expected: 'pas en l’an 3 millions', got: A.state.players[B.me].actAt < 1e17 ? 'pas en l’an 3 millions' : 'loin dans le futur' },
  ]);
  assert.equal(P(A).name, 'J0');
  assert.equal(A.state.players[C.me].secretHash, hashC);
  assert.ok(A.state.players[B.me].actAt < 1e17);
});

scenario('une fiche abîmée ne fait pas planter les passages des autres', (film) => {
  const { players: [A, B], clock } = newGame(2);
  film.look(A, 'au départ');
  forge(A, B, (st) => {
    const p = st.players[B.me];
    Object.assign(p, { offers: [{}, null], effects: [null, { to: A.me, id: 'x', key: 'home', ships: { fighter: 'x' }, take: { minerals: 'x' } }], fleets: [{}, null], actAt: p.actAt + 1000 });
  });
  clock.t += 60_000;
  assert.doesNotThrow(() => A.tick());
  const minerals = game.stateAt(P(A).planet, clock.t).stock.minerals;
  film.look(A, 'A a reçu la fiche abîmée de B, 1 min plus tard et un passage : rien n’a planté', [{ show: 'minéraux de A', at: P(A).home, expected: 'un nombre', got: minerals, ok: Number.isFinite(minerals) }]);
  assert.ok(Number.isFinite(minerals));
});

scenario('race ou identifiant spécial (constructor, __proto__) : écartés', (film) => {
  const { players: [A, B], clock } = newGame(2);
  film.look(A, 'au départ');
  forge(A, B, (st) => {
    st.players[B.me] = { ...st.players[B.me], race: 'constructor', actAt: st.players[B.me].actAt + 1000 };
    st.players.__proto__ = { id: '__proto__', name: 'Proto' };
  });
  film.look(A, 'A reçoit la fiche de B : race « constructor » et joueur « __proto__ » ; les deux sont écartés', [
    { show: 'race de B', at: A.state.players[B.me].home, expected: null, got: A.state.players[B.me].race },
    { show: 'joueur « Proto » ajouté', expected: false, got: A.state.players.name !== undefined },
  ]);
  assert.equal(A.state.players[B.me].race, null);
  assert.equal(A.state.players.name, undefined);
  assert.doesNotThrow(() => A.tick());
  film.look(A, 'après un passage de A : rien n’a planté', [{ show: 'race de B', at: A.state.players[B.me].home, expected: null, got: A.state.players[B.me].race }]);
});

scenario('une installation datée de bien avant la mienne ne me prend pas ma planète', (film) => {
  const { players: [A, B], clock } = newGame(2);
  film.look(A, 'au départ, chacun sur sa planète mère');
  forge(A, B, (st) => Object.assign(st.players[B.me], { home: { ...P(A).home }, claimAt: 1, actAt: st.players[B.me].actAt + 1000 }));
  film.look(A, 'B dit s’être installé sur la planète de A, bien avant lui : refusé', [{ show: 'à qui', at: P(A).home, expected: 'A', got: A.ownerAt(P(A).home)?.id === A.me ? 'A' : 'B' }]);
  assert.equal(A.ownerAt(P(A).home)?.id, A.me, 'la fiche antidatée est refusée');
  A.tick();
  film.look(A, 'après un passage de A : il garde sa planète', [{ show: 'planète mère de A', at: P(A).home, expected: true, got: !!(P(A).home && P(A).planet) }]);
  assert.ok(P(A).home && P(A).planet);
});

scenario('une heure de téléphone qui recule ne fait pas produire deux fois', (film) => {
  const { players: [A], clock } = newGame(1, ['human']);
  const pl = P(A).planet;
  pl.stock.minerals = 900;
  film.look(A, 'au départ, 900 minéraux');
  clock.t += 3_600_000;
  game.settle(pl, clock.t);
  film.look(A, 'une heure plus tard, production comptée', [{ show: 'minéraux', at: P(A).home, expected: 'plus de 900', got: pl.stock.minerals, ok: pl.stock.minerals > 900 }]);
  const honest = clone(pl);
  assert.equal(game.startBuild(honest, 'mine', clock.t), null);
  assert.equal(game.startBuild(pl, 'mine', clock.t - 3_000_000), null); // horloge reculée de 50 min
  const later = (x) => game.stateAt(x, clock.t + 600_000).stock.minerals;
  film.look(A, 'mine lancée avec une horloge reculée de 50 min : elle ne rapporte pas plus qu’à l’heure juste', [
    { show: 'fin du chantier après l’heure déjà comptée', at: P(A).home, expected: true, got: pl.queue.end > pl.at },
    { show: 'minéraux dans 10 min', at: P(A).home, expected: later(honest), got: later(pl), ok: Math.abs(later(pl) - later(honest)) < 1 },
  ]);
  assert.ok(pl.queue.end > pl.at, 'le chantier ne finit pas avant l’heure déjà comptée');
  assert.ok(Math.abs(later(pl) - later(honest)) < 1, 'autant qu’en construisant à l’heure juste');
});

scenario('un téléphone en avance de quelques heures reste visible des autres', (film) => {
  const { players: [A, B], clock } = newGame(2);
  const real = clock.t;
  film.look(A, 'au départ');
  clock.t = real + 2 * 3_600_000; // horloge de B en avance de 2 h
  B.build(Object.keys(game.RACES[P(B).race].buildings)[0]);
  clock.t = real;
  A.mergeIn(B.snapshot(), { pid: B.me });
  film.look(A, 'A, à l’heure juste, reçoit la fiche de B : il voit son chantier', [{ show: 'chantier de B, vu par A', at: P(B).home, expected: true, got: !!A.state.players[B.me].planet.queue }]);
  assert.ok(A.state.players[B.me].planet.queue, 'A voit le chantier de B');
});
