import { shipsAffordable, stateAt } from '../../../../../regles/game/index.js';
import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';

$('pi-ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-pi-ship]');
  const key = $('btn-open-planet').dataset.key;
  if (!btn || btn.disabled || !etat.session?.state) return;
  const me = etat.session.state.players[etat.session.me];
  const pl = etat.session.planetOf(me, key);
  if (!pl) return;
  const n = btn.dataset.n === 'max' ? shipsAffordable(me.race, btn.dataset.piShip, stateAt(pl.planet, etat.session.now()).stock) : Number(btn.dataset.n);
  if (n < 1) return;
  // Même choix que l'onglet de la planète (D-312) : tout de suite, ou au fil.
  if (btn.dataset.mode === 'plan') etat.session.planShips(btn.dataset.piShip, n, key);
  else etat.session.buildShips(btn.dataset.piShip, n, key);
});
