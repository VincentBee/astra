import { $ } from '../../outils/dollar.js';
import { renderLive } from '../../partie/render-live.js';

$('alerts-btn').onclick = () => {
  const open = $('alerts-panel').hidden;
  $('alerts-panel').hidden = !open;
  $('alerts-btn').setAttribute('aria-expanded', String(open));
  delete $('alerts-list').dataset.html; // réécrire la liste tout de suite
  renderLive();
};
