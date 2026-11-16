import { GX } from '../donnees/gx.js';
import { H } from '../donnees/h.js';
import { W } from '../donnees/w.js';
import { etat } from '../etat.js';
import { buildGraph } from './build-graph.js';
import { label } from './label.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';

export function renderGraph() {
  etat.graph = buildGraph();
  const { nodes, edges, width, height } = etat.graph;
  const out = [
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrow" d="M0,0 L10,5 L0,10 z"/></marker></defs>`,
  ];
  // Flèches des bâtiments d'abord : elles passent sous les autres.
  const order = { bld: 0, boost: 1, unlock: 2, req: 3 };
  for (const e of [...edges].sort((a, b) => order[a.kind] - order[b.kind])) {
    const a = nodes[e.from];
    const b = nodes[e.to];
    const x1 = a.x + W;
    const y1 = a.y + H / 2;
    const x2 = b.x - 2;
    const y2 = b.y + H / 2;
    const c1 = x1 + Math.min(GX, (x2 - x1) / 2);
    const c2 = x2 - GX / 2;
    out.push(`<path class="edge ${e.kind}" data-from="${e.from}" data-to="${e.to}" d="M${x1},${y1} C${c1},${y1} ${c2},${y2} ${x2},${y2}" marker-end="url(#arrow)"/>`);
    // Étiquette au milieu de la courbe (point t = 0,5 de la courbe de Bézier).
    // Pas pour le labo : le niveau demandé est écrit sur chaque technologie.
    const lx = (x1 + 3 * c1 + 3 * c2 + x2) / 8;
    const ly = (y1 + y2) / 2 - 5;
    if (e.lv > 1 && e.kind !== 'bld') out.push(`<text class="edge-label" data-from="${e.from}" data-to="${e.to}" x="${lx}" y="${ly}" text-anchor="middle">niv. ${e.lv}</text>`);
  }
  for (const n of Object.values(nodes)) {
    const [name, sub] = label(n);
    const rx = n.kind === 'building' ? 3 : n.kind === 'power' ? H / 2 : 10;
    out.push(`
      <g class="gnode ${n.kind}" data-id="${n.id}" tabindex="0" role="button" aria-label="${esc(name)}" transform="translate(${n.x},${n.y})">
        <rect width="${W}" height="${H}" rx="${rx}"/>
        <text class="name" x="12" y="21">${esc(name)}</text>
        <text class="sub" x="12" y="38">${esc(sub)}</text>
      </g>`);
  }
  $('graph').innerHTML = `<svg class="graph" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${out.join('')}</svg>`;
  // Les noms trop longs pour la bulle sont resserrés.
  for (const t of $('graph').querySelectorAll('.gnode text')) {
    if (t.getComputedTextLength() > W - 22) t.setAttribute('textLength', W - 22), t.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  }
}
