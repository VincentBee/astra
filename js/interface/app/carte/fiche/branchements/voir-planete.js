import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { showView } from '../../../partie/show-view.js';
import { renderPick } from '../render-pick.js';

$('btn-open-planet').onclick = (e) => {
  etat.selected = null; // sinon la fiche se rouvrirait au retour sur la carte
  renderPick();
  showView('planet', e.currentTarget.dataset.key || 'home');
};
