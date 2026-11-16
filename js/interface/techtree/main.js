// Page « Technologies » (technologies.html), hors du jeu : le graphe de
// chaque race (bâtiments, technologies, vaisseaux, pouvoirs), lu dans les
// données du jeu.

import { RACE_KEYS } from '../../game.js';
import { etat } from './etat.js';
import { render } from './graphe/render.js';
import { select } from './graphe/select.js';
import { $ } from './outils/dom.js';

etat.race = RACE_KEYS.includes(location.hash.slice(1)) ? location.hash.slice(1) : RACE_KEYS[0];

$('tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-race]');
  if (!b || b.dataset.race === etat.race) return;
  etat.race = b.dataset.race;
  history.replaceState(null, '', `#${etat.race}`);
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
  if (RACE_KEYS.includes(r) && r !== etat.race) (etat.race = r), render();
});

render();
