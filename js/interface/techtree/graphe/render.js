import { RACES } from '../../../game.js';
import { etat } from '../etat.js';
import { renderGraph } from './render-graph.js';
import { renderTabs } from './render-tabs.js';
import { $ } from '../outils/dom.js';
import { renderPanel } from '../panneau/render-panel.js';

export function render() {
  const R = RACES[etat.race];
  document.documentElement.style.setProperty('--race', R.color);
  renderTabs();
  $('pitch').textContent = R.pitch;
  etat.selected = null;
  renderGraph();
  renderPanel();
}
