import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('btn-move-close').onclick = () => {
  $('sheet-move').hidden = true;
  etat.moveSheet = null;
};
