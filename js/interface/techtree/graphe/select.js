import { etat } from '../etat.js';
import { $ } from '../outils/dom.js';
import { renderPanel } from '../panneau/render-panel.js';

/** Met en avant une bulle, tout ce qu'il faut avant elle et ce qu'elle ouvre juste après. */
export function select(id) {
  etat.selected = etat.selected === id ? null : id;
  const { nodes, edges } = etat.graph;
  const linked = new Set();
  if (etat.selected) {
    linked.add(etat.selected);
    const up = [etat.selected];
    while (up.length) for (const p of nodes[up.pop()].parents) if (!linked.has(p)) linked.add(p), up.push(p);
    for (const e of edges) if (e.from === etat.selected) linked.add(e.to);
  }
  const svg = $('graph');
  for (const g of svg.querySelectorAll('.gnode')) {
    g.classList.toggle('sel', g.dataset.id === etat.selected);
    g.classList.toggle('dim', !!etat.selected && !linked.has(g.dataset.id));
  }
  for (const el of svg.querySelectorAll('.edge, .edge-label')) {
    const on = linked.has(el.dataset.from) && linked.has(el.dataset.to);
    el.classList.toggle('hl', !!etat.selected && on);
    el.classList.toggle('dim', !!etat.selected && !on);
  }
  renderPanel();
}
