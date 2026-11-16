import { TECHS, SHIP_KEYS, shipUnlock } from '../../../tech.js';
import { RACES, POWER_KEYS } from '../../../game.js';
import { GX } from '../donnees/gx.js';
import { GY } from '../donnees/gy.js';
import { H } from '../donnees/h.js';
import { PAD } from '../donnees/pad.js';
import { W } from '../donnees/w.js';
import { etat } from '../etat.js';
import { techReqs } from '../outils/tech-reqs.js';

/**
 * Bulles et flèches, rangées en couches de gauche à droite : les bâtiments
 * d'abord, puis chaque technologie juste après son prérequis le plus profond,
 * chaque vaisseau après la technologie qui le débloque, et les pouvoirs après
 * le bâtiment qui les renforce.
 *
 * Flèches : `req` (technologie à avoir avant), `unlock` (débloque un
 * vaisseau), `bld` (bâtiment nécessaire : labo, chantier), `boost` (renforce).
 * `parents` ne sert qu'à la mise en page.
 */
export function buildGraph() {
  const R = RACES[etat.race];
  const techs = TECHS[etat.race];
  const nodes = {};
  const edges = [];
  const bkeys = Object.keys(R.buildings);
  for (const k of ['lab', 'yard', ...bkeys.filter((k) => k !== 'lab' && k !== 'yard')]) {
    // Le chantier se range juste avant les vaisseaux, en bas, pour garder ses flèches courtes.
    nodes[`b:${k}`] = { id: `b:${k}`, kind: 'building', key: k, parents: [], float: k === 'yard' };
  }
  for (const [k, t] of Object.entries(techs)) {
    nodes[k] = { id: k, kind: 'tech', parents: ['b:lab', ...techReqs(t).map(([p]) => p)] };
    // Le labo ne pointe que vers les premières technologies, pour ne pas barrer le
    // graphe : le niveau de labo de chacune est écrit dans sa bulle.
    if (!techReqs(t).length) edges.push({ from: 'b:lab', to: k, lv: t.req.lab, kind: 'bld' });
    for (const [p, lv] of techReqs(t)) edges.push({ from: p, to: k, lv, kind: 'req' });
  }
  for (const type of SHIP_KEYS) {
    const u = shipUnlock(etat.race, type);
    const id = `ship:${type}`;
    nodes[id] = { id, kind: 'ship', type, parents: u ? [u.key] : [] };
    if (u) edges.push({ from: u.key, to: id, lv: u.level, kind: 'unlock' });
    edges.push({ from: 'b:yard', to: id, lv: 1, kind: 'bld' });
  }
  if (etat.race === 'alien') {
    for (const k of POWER_KEYS) {
      nodes[`p:${k}`] = { id: `p:${k}`, kind: 'power', key: k, parents: ['b:amplifier'] };
      edges.push({ from: 'b:amplifier', to: `p:${k}`, lv: 1, kind: 'boost' });
    }
  }
  const children = (id) => edges.filter((e) => e.from === id).map((e) => e.to);
  const depth = (id) => (nodes[id].depth ??= Math.max(-1, ...nodes[id].parents.map(depth)) + 1);
  const size = (id) => (nodes[id].size ??= children(id).reduce((n, c) => n + 1 + (nodes[c].float ? 0 : size(c)), 0));
  Object.keys(nodes).forEach((id) => (depth(id), size(id)));
  for (const n of Object.values(nodes)) if (n.float) n.depth = Math.min(...children(n.id).map((c) => nodes[c].depth)) - 1;

  // Rangées : chaque bulle vise la rangée de son parent, sans en chevaucher une autre.
  // Les grosses branches d'abord, pour que l'arbre principal reste en haut.
  const cols = [];
  for (const n of Object.values(nodes)) (cols[n.depth] ||= []).push(n);
  let rows = 0;
  for (const col of cols) {
    const want = (n) => (n.float ? Infinity : n.parents.length ? Math.max(...n.parents.map((p) => nodes[p].row)) : 0);
    col.sort((a, b) => want(a) - want(b) || b.size - a.size);
    let next = 0;
    for (const n of col) {
      n.row = n.float ? next : Math.max(want(n), next);
      next = n.row + 1;
      n.x = PAD + n.depth * (W + GX);
      n.y = PAD + n.row * (H + GY);
    }
    rows = Math.max(rows, next);
  }
  return { nodes, edges, width: 2 * PAD + cols.length * W + (cols.length - 1) * GX, height: 2 * PAD + rows * H + (rows - 1) * GY };
}
