import { renderPick } from '../../carte/fiche/render-pick.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('btn-ready').onclick = (e) => {
  if (!etat.session?.state) return;
  etat.session.ready(e.currentTarget.dataset.on === '1');
  etat.session.checkStart(); // seul présent : le départ part tout de suite
  renderPick();
};
