import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('plan').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-unplan]');
  if (btn && !btn.disabled) etat.session.unplan(btn.dataset.key, Number(btn.dataset.unplan), etat.openKey);
});
