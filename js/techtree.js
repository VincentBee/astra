// Page « Technologies » (technologies.html), hors du jeu : le graphe de
// chaque race (bâtiments, technologies, vaisseaux, pouvoirs), lu dans les
// données du jeu.
import { TECHS, SHIPS, SHIP_KEYS, techCost, researchDuration, shipUnlock, TEMPO } from './tech.js';
import { RACES, RACE_KEYS, resIcon, raceIcon, POWERS, POWER_KEYS, upgradeCost, buildDuration } from './game.js';

const ROLES = { cargo: 'Cargo', fighter: 'Chasseur', heavy: 'Vaisseau lourd', colony: 'Colonisateur' };
const BONUS = { minerals: 'minéraux', food: 'nourriture', energy: 'énergie', speed: 'vitesse', attack: 'attaque', hull: 'coque' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = (n) => Math.round(n).toLocaleString('fr-FR');
const cost = (c) =>
  Object.entries(c)
    .map(([r, v]) => `<span class="qty">${num(v)}${resIcon(r)}</span>`)
    .join(' · ');
const dur = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

/** Prérequis technologiques d'une technologie (sans le labo). */
const techReqs = (t) => Object.entries(t.req).filter(([k]) => k !== 'lab');

let race = RACE_KEYS.includes(location.hash.slice(1)) ? location.hash.slice(1) : RACE_KEYS[0];
let selected = null;
let graph = null;

// Taille des bulles et écarts, en px.
const W = 164;
const H = 50;
const GX = 46;
const GY = 20;
const PAD = 8;

function renderTabs() {
  $('tabs').innerHTML = RACE_KEYS.map((r) => {
    const R = RACES[r];
    return `<button role="tab" data-race="${r}" aria-selected="${r === race}" style="--c:${R.color}">${raceIcon(r)}${esc(R.name)}</button>`;
  }).join('');
}

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
function buildGraph() {
  const R = RACES[race];
  const techs = TECHS[race];
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
    const u = shipUnlock(race, type);
    const id = `ship:${type}`;
    nodes[id] = { id, kind: 'ship', type, parents: u ? [u.key] : [] };
    if (u) edges.push({ from: u.key, to: id, lv: u.level, kind: 'unlock' });
    edges.push({ from: 'b:yard', to: id, lv: 1, kind: 'bld' });
  }
  if (race === 'alien') {
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

/** Nom et sous-titre d'une bulle. */
function label(n) {
  const R = RACES[race];
  if (n.kind === 'tech') {
    const t = TECHS[race][n.id];
    return [t.name, `${R.buildings.lab.short} ${t.req.lab} · max ${t.max}`];
  }
  if (n.kind === 'ship') return [SHIPS[race][n.type].name, ROLES[n.type]];
  if (n.kind === 'power') return [POWERS[n.key].name, `Pouvoir · recharge ${dur(POWERS[n.key].cooldown)}`];
  const b = R.buildings[n.key];
  return [b.name, b.start ? `Bâtiment · niv. ${b.start} au départ` : 'Bâtiment'];
}

function renderGraph() {
  graph = buildGraph();
  const { nodes, edges, width, height } = graph;
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

function buildingPanel(key) {
  const R = RACES[race];
  const b = R.buildings[key];
  const rows = [];
  for (let lv = 0; lv < 6; lv++) {
    const c = Object.fromEntries(Object.entries(upgradeCost(race, key, lv)).filter(([, v]) => v > 0));
    rows.push(`<tr><td>${lv + 1}</td><td>${cost(c)}</td><td>${dur(buildDuration(race, {}, upgradeCost(race, key, lv)))}</td></tr>`);
  }
  const opens = {
    lab: 'Ouvre la recherche. Chaque technologie demande un niveau de labo, écrit dans sa bulle.',
    yard: 'Nécessaire pour construire chaque vaisseau.',
    amplifier: 'Renforce les deux pouvoirs psychiques : +25 % par niveau.',
  }[key];
  return `
    <div class="kind">Bâtiment</div>
    <h3>${esc(b.name)}</h3>
    <p>${esc(b.desc)}</p>
    ${opens ? `<p>${esc(opens)}</p>` : ''}
    <div class="tags"><span class="tag req">${b.start ? `niv. ${b.start} au départ` : 'à construire'}</span><span class="tag req">coût ×${String(b.factor).replace('.', ',')} par niveau</span></div>
    <table><thead><tr><th>Niv.</th><th>Coût</th><th>Durée</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function powerPanel(key) {
  const P = POWERS[key];
  const c1 = P.cost(1);
  return `
    <div class="kind">Pouvoir psychique</div>
    <h3>${esc(P.name)}</h3>
    <p>${esc(P.desc)}</p>
    <p>Renforcé par l’${esc(RACES.alien.buildings.amplifier.name.toLowerCase())} : +25 % par niveau.</p>
    <dl>
      <dt>Coût</dt><dd><span class="qty">${num(c1.energy)}${resIcon('energy')}</span> par psionique</dd>
      <dt>Recharge</dt><dd>${dur(P.cooldown)}</dd>
      ${P.duration ? `<dt>Durée</dt><dd>${dur(P.duration)}</dd>` : ''}
    </dl>`;
}

function techPanel(key) {
  const t = TECHS[race][key];
  const lab = RACES[race].buildings.lab.short;
  const tags = [];
  for (const [type, lv] of Object.entries(t.unlock || {})) {
    tags.push(`<span class="tag unlock">▸ ${esc(SHIPS[race][type].name)}${lv > 1 ? ` (niv. ${lv})` : ''}</span>`);
  }
  for (const [b, v] of Object.entries(t.bonus || {})) tags.push(`<span class="tag">+${Math.round(v * 100)} % ${BONUS[b]}</span>`);
  if (t.range) tags.push(`<span class="tag">+${t.range} case de détection</span>`);
  tags.push(`<span class="tag req">${esc(lab)} ${t.req.lab}</span>`);
  for (const [k, lv] of techReqs(t)) tags.push(`<span class="tag req">${esc(TECHS[race][k].name)} ${lv}</span>`);

  const rows = [];
  for (let lv = 0; lv < t.max; lv++) {
    const c = techCost(race, key, lv);
    rows.push(`<tr><td>${lv + 1}</td><td>${cost(c)}</td><td>${dur(researchDuration(c, t.req.lab))}</td></tr>`);
  }
  return `
    <div class="kind">Technologie</div>
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.desc)}</p>
    <div class="tags">${tags.join('')}</div>
    <table><thead><tr><th>Niv.</th><th>Coût</th><th>Durée</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

function shipPanel(type) {
  const s = SHIPS[race][type];
  const u = shipUnlock(race, type);
  const by = u ? `${TECHS[race][u.key].name}${u.level > 1 ? ` niv. ${u.level}` : ''}` : '—';
  return `
    <div class="kind">Vaisseau · ${ROLES[type]}</div>
    <h3>${esc(s.name)}</h3>
    <p>Débloqué par ${esc(by)}.</p>
    <dl>
      <dt>Attaque</dt><dd>${s.attack}</dd>
      <dt>Coque</dt><dd>${s.hull}</dd>
      <dt>Soute</dt><dd>${num(s.cargo)}</dd>
      <dt>Vitesse</dt><dd>${+(s.speed * TEMPO).toFixed(1)} cases/min</dd>
      <dt>Autonomie</dt><dd>${Math.round(s.tank / s.burn)} cases</dd>
      <dt>Coût</dt><dd>${cost(s.cost)}</dd>
    </dl>`;
}

function renderPanel() {
  const R = RACES[race];
  if (!selected) {
    $('panel').innerHTML = `
      <div class="kind">${raceIcon(race)} ${esc(R.name)}</div>
      <h3>Choisis une bulle</h3>
      <p>À gauche les bâtiments (coins carrés), puis les technologies, les vaisseaux (en pointillés)${race === 'alien' ? ' et les pouvoirs (arrondis)' : ''}. Chaque flèche part de ce qu’il faut avoir avant.</p>
      <p>La recherche demande d’abord un labo sur la planète mère : ${esc(R.buildings.lab.name)}. « ${esc(R.buildings.lab.short)} 2 » veut dire qu’il doit être au niveau 2.</p>`;
    return;
  }
  const n = graph.nodes[selected];
  $('panel').innerHTML = { tech: () => techPanel(n.id), ship: () => shipPanel(n.type), building: () => buildingPanel(n.key), power: () => powerPanel(n.key) }[n.kind]();
}

/** Met en avant une bulle, tout ce qu'il faut avant elle et ce qu'elle ouvre juste après. */
function select(id) {
  selected = selected === id ? null : id;
  const { nodes, edges } = graph;
  const linked = new Set();
  if (selected) {
    linked.add(selected);
    const up = [selected];
    while (up.length) for (const p of nodes[up.pop()].parents) if (!linked.has(p)) linked.add(p), up.push(p);
    for (const e of edges) if (e.from === selected) linked.add(e.to);
  }
  const svg = $('graph');
  for (const g of svg.querySelectorAll('.gnode')) {
    g.classList.toggle('sel', g.dataset.id === selected);
    g.classList.toggle('dim', !!selected && !linked.has(g.dataset.id));
  }
  for (const el of svg.querySelectorAll('.edge, .edge-label')) {
    const on = linked.has(el.dataset.from) && linked.has(el.dataset.to);
    el.classList.toggle('hl', !!selected && on);
    el.classList.toggle('dim', !!selected && !on);
  }
  renderPanel();
}

function render() {
  const R = RACES[race];
  document.documentElement.style.setProperty('--race', R.color);
  renderTabs();
  $('pitch').textContent = R.pitch;
  selected = null;
  renderGraph();
  renderPanel();
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-race]');
  if (!b || b.dataset.race === race) return;
  race = b.dataset.race;
  history.replaceState(null, '', `#${race}`);
  render();
});
$('graph').addEventListener('click', (e) => {
  const g = e.target.closest('.gnode');
  if (g) select(g.dataset.id);
});
$('graph').addEventListener('keydown', (e) => {
  const g = e.target.closest('.gnode');
  if (g && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(), select(g.dataset.id);
});
addEventListener('hashchange', () => {
  const r = location.hash.slice(1);
  if (RACE_KEYS.includes(r) && r !== race) (race = r), render();
});

render();
