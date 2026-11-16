import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('ships').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-ship]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'plan') etat.session.planShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
    else etat.session.buildShips(btn.dataset.ship, Number(btn.dataset.n), etat.openKey);
  }
});
