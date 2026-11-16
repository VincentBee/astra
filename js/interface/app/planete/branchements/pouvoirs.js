import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('powers').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-power]');
  if (btn && !btn.disabled) etat.session.power(btn.dataset.power, etat.openKey);
});
