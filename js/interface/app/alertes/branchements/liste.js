import { renderPick } from '../../carte/fiche/render-pick.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { showView } from '../../partie/show-view.js';

$('alerts-list').addEventListener('click', (e) => {
  const go = e.target.closest('[data-alert-go]');
  if (!go) return;
  etat.selected = null;
  renderPick();
  showView('planet', go.dataset.alertGo);
});
