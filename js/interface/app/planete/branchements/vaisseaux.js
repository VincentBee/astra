import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { toggleAuto } from '../toggle-auto.js';

$('ships').addEventListener('click', (e) => {
  const auto = e.target.closest('[data-auto-ship]');
  if (auto && !auto.disabled && etat.session?.state) return toggleAuto(etat.openKey, auto.dataset.autoShip);
  const btn = e.target.closest('[data-ship]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'plan') etat.session.planShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
    else etat.session.buildShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
  }
});
