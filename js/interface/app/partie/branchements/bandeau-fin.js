import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { showFinish } from '../show-finish.js';

$('race').addEventListener('click', (e) => {
  if (e.target.closest('[data-finish]') && etat.session?.over) showFinish(etat.session.over, true);
});
