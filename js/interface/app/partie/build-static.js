import { POWER_KEYS, POWERS, RACES, RES_INFO, resIcon } from '../../../regles/game/index.js';
import { ic } from '../../icons/index.js';
import { SHIP_KEYS, SHIPS, TECHS } from '../../../regles/tech/index.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { cardHead } from '../planete/card-head.js';
import { drawSparks } from '../planete/courbes/draw-sparks.js';
import { spark } from '../planete/courbes/spark.js';
import { soilTiles } from '../planete/sol/soil-tiles.js';
import { showTab } from './show-tab.js';

export function buildStatic() {
  const race = etat.session.myRace;
  const R = RACES[race];
  etat.builtFor = race;
  const tiles = R.resources.map(
    (r) => `<div class="tile ${r}" title="${RES_INFO[r].name}">${spark(r)}
      <span class="label">${resIcon(r)}<span class="clim mono" data-clim="${r}" hidden></span></span>
      <span class="amount mono" data-res="${r}">0</span>
      <span class="rate mono" data-rate="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-gauge="${r}"></div></div>
    </div>`,
  );
  if (R.pop) {
    tiles.push(`<div class="tile pop" title="${R.pop.label}">${spark('pop')}<span class="label">${resIcon('pop', R.pop.label)}</span>
      <span class="amount mono" data-pop></span>
      <span class="rate mono" data-poprate></span>
      <span class="rate mono" data-popextra></span>
      <div class="gauge"><div class="gauge-fill" data-popgauge></div></div></div>`);
  } else {
    tiles.push(`<div class="tile grid" title="Réseau électrique">${spark('grid')}<span class="label">${resIcon('energy', 'Réseau')}Réseau</span>
      <span class="amount mono" data-grid></span>
      <span class="rate mono" data-gridrate></span>
      <span class="rate mono" data-gridextra></span></div>`);
  }
  $('resources').innerHTML = tiles.join('');
  $('soil').innerHTML = soilTiles('soil');
  drawSparks();

  $('buildings').innerHTML = Object.entries(R.buildings)
    .map(
      ([k, b]) => `<article class="building card" data-card="${k}">
      ${cardHead(b.name, `data-level="${k}"`)}
      <p class="cost mono" data-cost="${k}"></p>
      <button class="secondary small" data-build="${k}">${ic('up')}</button>
      <p class="b-desc">${esc(b.desc)} <button class="ghost small b-down" data-demolish="${k}">Déconstruire un niveau</button></p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`,
    )
    .join('');

  $('techs').innerHTML = Object.entries(TECHS[race])
    .map(
      ([k, t]) => `<article class="building card" data-tcard="${k}">
      ${cardHead(t.name, `data-tlevel="${k}"`)}
      <p class="cost mono"><span data-tcost="${k}"></span> <span class="req" data-treq="${k}" hidden></span></p>
      <button class="secondary small" data-research="${k}">${ic('up')}</button>
      <p class="b-desc">${esc(t.desc)}</p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`,
    )
    .join('');

  $('ships').innerHTML = SHIP_KEYS.map((k) => {
    const S = SHIPS[race][k];
    return `<article class="building card" data-scard="${k}">
      ${cardHead(S.name, `data-sdocked="${k}"`)}
      <p class="cost mono"><span data-scost="${k}"></span> <span class="req" data-sreq="${k}" hidden></span></p>
      <div class="ship-actions">
        <button class="secondary small" data-ship="${k}" data-n="1" aria-label="Construire 1 ${esc(S.name)}">×1</button>
        <button class="secondary small" data-ship="${k}" data-n="5" aria-label="Construire 5 ${esc(S.name)}">×5</button>
      </div>
      <p class="ship-stats b-desc" data-sstats="${k}"></p>
      <div class="card-bar" hidden><div class="bar-fill"></div></div>
    </article>`;
  }).join('');

  // Chantier de la fiche planète, sur la carte : une ligne par vaisseau.
  $('pi-ships').innerHTML = SHIP_KEYS.map((k) => {
    const S = SHIPS[race][k];
    return `<div class="pi-ship" data-piship="${k}">
      <div class="pi-ship-main"><span class="p-name">${esc(S.name)}</span> <span class="cost mono" data-picost="${k}"></span> <span class="hint mono" data-pinote="${k}"></span></div>
      <div class="ship-actions">
        <button class="secondary small" data-pi-ship="${k}" data-n="1" aria-label="Construire 1 ${esc(S.name)}">×1</button>
        <button class="secondary small" data-pi-ship="${k}" data-n="5" aria-label="Construire 5 ${esc(S.name)}">×5</button>
        <button class="secondary small" data-pi-ship="${k}" data-n="max" aria-label="Construire autant de ${esc(S.name)} que possible">Max</button>
      </div>
    </div>`;
  }).join('');

  $('powers-zone').hidden = race !== 'alien';
  // Les pouvoirs ont leur onglet, chez les aliens seulement.
  $('tab-power').hidden = race !== 'alien';
  if (race !== 'alien' && $('view-planet').dataset.tab === 'power') showTab('build');
  $('powers').innerHTML =
    race === 'alien'
      ? POWER_KEYS.map(
          (k) => `<article class="building power card" data-pcard="${k}">
        ${cardHead(POWERS[k].name, `data-pready="${k}"`)}
        <p class="cost mono" data-pcost="${k}"></p>
        <button class="secondary small" data-power="${k}">${ic('play')}</button>
        <p class="b-desc">${esc(POWERS[k].desc)}</p>
      </article>`,
        ).join('')
      : '';
}
