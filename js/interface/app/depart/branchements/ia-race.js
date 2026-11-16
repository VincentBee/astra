import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('bot-races').addEventListener('click', (e) => {
  const el = e.target.closest('[data-botrace]');
  if (!el) return;
  etat.botRace = el.dataset.botrace;
  for (const b of document.querySelectorAll('[data-botrace]')) b.setAttribute('aria-checked', String(b.dataset.botrace === etat.botRace));
});
