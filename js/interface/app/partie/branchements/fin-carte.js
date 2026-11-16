import { $ } from '../../outils/dollar.js';
import { showView } from '../show-view.js';

$('btn-finish-map').onclick = () => {
  $('sheet-finish').hidden = true;
  showView('map');
};
