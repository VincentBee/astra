import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('trades').addEventListener('click', (e) => {
  const acc = e.target.closest('[data-accept]')?.dataset.accept;
  const ref = e.target.closest('[data-refuse]')?.dataset.refuse;
  const [pid, id] = (acc || ref || '').split(':');
  if (pid && id) etat.session.answerTrade(pid, id, !!acc);
});
