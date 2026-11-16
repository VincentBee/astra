import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('techs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-research]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'plan') etat.session.planResearch(btn.dataset.research, etat.openKey);
    else etat.session.research(btn.dataset.research, etat.openKey);
  }
});
