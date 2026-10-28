// Page « Technologies » (technologies.html), hors du jeu : l'arbre de
// recherche et les vaisseaux de chaque race, lus dans les données du jeu.
import { TECHS, SHIPS, SHIP_KEYS, techCost, researchDuration, shipUnlock } from './tech.js';
import { RACES, RACE_KEYS, RES_INFO } from './game.js';

const ROLES = { cargo: 'Cargo', fighter: 'Chasseur', heavy: 'Vaisseau lourd', colony: 'Colonisateur' };
const BONUS = { minerals: 'minéraux', food: 'nourriture', energy: 'énergie', speed: 'vitesse', attack: 'attaque', hull: 'coque' };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const num = (n) => Math.round(n).toLocaleString('fr-FR');
const cost = (c) =>
  Object.entries(c)
    .map(([r, v]) => `<span class="r-${r}">${num(v)} ${RES_INFO[r].short}</span>`)
    .join(' · ');
const dur = (ms) => {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
};

/** Prérequis technologiques d'une technologie (sans le labo). */
const techReqs = (t) => Object.entries(t.req).filter(([k]) => k !== 'lab');

let race = RACE_KEYS.includes(location.hash.slice(1)) ? location.hash.slice(1) : RACE_KEYS[0];
let selected = null;

function renderTabs() {
  $('tabs').innerHTML = RACE_KEYS.map((r) => {
    const R = RACES[r];
    return `<button role="tab" data-race="${r}" aria-selected="${r === race}" style="--c:${R.color}"><span>${R.icon}</span>${esc(R.name)}</button>`;
  }).join('');
}

function techNode(key, t) {
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
    <article class="node" data-key="${key}" tabindex="0">
      <span class="max">max ${t.max}</span>
      <h3>${esc(t.name)}</h3>
      <p>${esc(t.desc)}</p>
      <div class="tags">${tags.join('')}</div>
      <details>
        <summary>Coût par niveau</summary>
        <table><thead><tr><th>Niv.</th><th>Coût</th><th>Durée</th></tr></thead><tbody>${rows.join('')}</tbody></table>
      </details>
    </article>`;
}

function renderTree() {
  const techs = TECHS[race];
  const lab = RACES[race].buildings.lab;
  const levels = [...new Set(Object.values(techs).map((t) => t.req.lab))].sort((a, b) => a - b);
  const cols = levels.map((L) => {
    const nodes = Object.entries(techs)
      .filter(([, t]) => t.req.lab === L)
      .map(([k, t]) => techNode(k, t))
      .join('');
    return `<div class="col"><div class="col-head">${esc(lab.name)} · niv. ${L}</div>${nodes}</div>`;
  });
  $('tree').innerHTML = `<svg aria-hidden="true"></svg><div class="cols">${cols.join('')}</div>`;
  drawEdges();
}

/** Liens prérequis → technologie, recalculés à chaque changement de mise en page. */
function drawEdges() {
  const tree = $('tree');
  const svg = tree.querySelector('svg');
  if (!svg) return;
  const box = tree.getBoundingClientRect();
  const rect = (k) => {
    const r = tree.querySelector(`.node[data-key="${k}"]`).getBoundingClientRect();
    return { l: r.left - box.left, r: r.right - box.left, t: r.top - box.top, b: r.bottom - box.top, cx: r.left - box.left + r.width / 2, cy: r.top - box.top + r.height / 2 };
  };
  const out = [];
  for (const [key, t] of Object.entries(TECHS[race])) {
    for (const [from, lv] of techReqs(t)) {
      const a = rect(from);
      const b = rect(key);
      const on = selected && (selected === key || selected === from) ? ' hl' : '';
      // Colonnes empilées (téléphone) : pas de lien, le SVG est caché.
      if (b.l < a.r) continue;
      const mx = (a.r + b.l) / 2;
      out.push(`<path class="edge${on}" d="M${a.r},${a.cy} C${mx},${a.cy} ${mx},${b.cy} ${b.l},${b.cy}"/>`);
      // Étiquette juste avant la carte visée : le lien peut traverser une colonne.
      if (lv > 1) out.push(`<text class="edge-label" x="${b.l - 22}" y="${b.cy - 6}" text-anchor="middle">niv. ${lv}</text>`);
    }
  }
  svg.innerHTML = out.join('');
}

/** Met en avant une technologie, ses prérequis et ce qu'elle ouvre. */
function highlight(key) {
  selected = selected === key ? null : key;
  const techs = TECHS[race];
  const linked = new Set();
  if (selected) {
    linked.add(selected);
    // Tous les ancêtres.
    const up = [selected];
    while (up.length) for (const [k] of techReqs(techs[up.pop()])) if (!linked.has(k)) linked.add(k), up.push(k);
    // Les descendants directs.
    for (const [k, t] of Object.entries(techs)) if (techReqs(t).some(([r]) => r === selected)) linked.add(k);
  }
  for (const n of $('tree').querySelectorAll('.node')) {
    n.classList.toggle('hl', n.dataset.key === selected);
    n.classList.toggle('dim', !!selected && !linked.has(n.dataset.key));
  }
  drawEdges();
}

function renderShips() {
  $('ships').innerHTML = SHIP_KEYS.map((type) => {
    const s = SHIPS[race][type];
    const u = shipUnlock(race, type);
    const by = u ? `${TECHS[race][u.key].name}${u.level > 1 ? ` niv. ${u.level}` : ''}` : '—';
    return `
      <article class="ship">
        <h3>${esc(s.name)}</h3>
        <div class="role">${ROLES[type]} · débloqué par ${esc(by)}</div>
        <dl>
          <dt>Attaque</dt><dd>${s.attack}</dd>
          <dt>Coque</dt><dd>${s.hull}</dd>
          <dt>Soute</dt><dd>${num(s.cargo)}</dd>
          <dt>Vitesse</dt><dd>${s.speed} cases/min</dd>
          <dt>Autonomie</dt><dd>${Math.round(s.tank / s.burn)} cases</dd>
          <dt>Coût</dt><dd>${cost(s.cost)}</dd>
        </dl>
      </article>`;
  }).join('');
}

function render() {
  const R = RACES[race];
  document.documentElement.style.setProperty('--race', R.color);
  renderTabs();
  $('pitch').textContent = R.pitch;
  $('ships-title').textContent = `Vaisseaux des ${R.name.toLowerCase()}`;
  selected = null;
  renderTree();
  renderShips();
}

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-race]');
  if (!b || b.dataset.race === race) return;
  race = b.dataset.race;
  history.replaceState(null, '', `#${race}`);
  render();
});
$('tree').addEventListener('click', (e) => {
  if (e.target.closest('details')) return;
  const n = e.target.closest('.node');
  if (n) highlight(n.dataset.key);
});
$('tree').addEventListener('keydown', (e) => {
  const n = e.target.closest('.node');
  if (n && (e.key === 'Enter' || e.key === ' ')) e.preventDefault(), highlight(n.dataset.key);
});
addEventListener('hashchange', () => {
  const r = location.hash.slice(1);
  if (RACE_KEYS.includes(r) && r !== race) (race = r), render();
});
// Les liens suivent la mise en page (taille d'écran, détails ouverts).
new ResizeObserver(drawEdges).observe($('tree'));

render();
