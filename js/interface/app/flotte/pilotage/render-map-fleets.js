import { countShips, fuelAt, moving } from '../../../../fleet.js';
import { RACES, stateAt } from '../../../../game.js';
import { ic } from '../../../../icons.js';
import { SHIP_KEYS, SHIPS } from '../../../../tech.js';
import { de } from '../../carte/de.js';
import { etat } from '../../etat.js';
import { clock } from '../../outils/clock.js';
import { $ } from '../../outils/dollar.js';
import { DRY } from '../../outils/dry.js';
import { esc } from '../../outils/esc.js';
import { fleetName } from '../fleet-name.js';
import { fleetStatus } from '../fleet-status.js';
import { fillWord } from './fill-word.js';
import { GAUGE_NAMES } from './gauge-names.js';
import { stockFill } from './stock-fill.js';

export function renderMapFleets(me = etat.session?.state?.players[etat.session.me], now = etat.session?.now()) {
  const box = $('map-fleets');
  const fleets = me?.fleets || [];
  const planets = me ? etat.session.planetsOf(me) : [];
  box.hidden = !fleets.length && !planets.length;
  const shipIcons = (ships) =>
    SHIP_KEYS.filter((k) => ships[k])
      .map((k) => `<span title="${esc(SHIPS[me.race][k].name)}">${ic(k)}${ships[k]}</span>`)
      .join('');
  // Le statut change rarement, le compte à rebours chaque seconde : on ne réécrit le HTML que
  // pour le premier (redessiner sous le doigt ferait rater le toucher), le reste en place.
  const planetHtml = planets
    .map((pl) => {
      const s = stateAt(pl.planet, now);
      const yard = s.levels.yard || 0;
      const docked = countShips(s.ships);
      const status = s.yard
        ? `Chantier : +${s.yard.count} ${SHIPS[me.race][s.yard.type].name}`
        : !yard
          ? `🔒 ${RACES[me.race].buildings.yard.name}`
          : docked
            ? `${docked} à quai`
            : 'Aucun vaisseau à quai';
      const build = yard
        ? `<button class="secondary small icon-only" data-mp-build="${esc(pl.key)}" title="Construire des vaisseaux ${esc(de(pl.name))}" aria-label="Construire des vaisseaux ${esc(de(pl.name))}">${ic('plus')}</button>`
        : '';
      const go = docked
        ? `<button class="secondary small icon-only" data-mp-go="${esc(pl.key)}" title="Faire décoller des vaisseaux ${esc(de(pl.name))}" aria-label="Faire décoller des vaisseaux ${esc(de(pl.name))}">${ic('fleet')}</button>`
        : '';
      // Jauges : une barre par stock ; leur largeur et leur texte se mettent à jour en place (plus bas).
      const gauges = stockFill(me.race, s)
        .map((g) => `<i class="mp-g" data-g="${g.res}" style="--c: var(--${g.res})"><b></b></i>`)
        .join('');
      return `<div class="mf mp" role="group" aria-label="${esc(pl.name)}" data-planet="${esc(pl.key)}">
        <span class="mf-top"><strong>${ic('planet')}${esc(pl.name)}</strong><span class="mf-clock"></span></span>
        <span class="mp-gauges" role="img">${gauges}</span>
        <span class="mf-ships">${shipIcons(s.ships)}</span>
        <span class="mf-status">${esc(status)}</span>
        <span class="mp-actions">${build}${go}</span></div>`;
    })
    .join('');
  const fleetHtml = fleets
    .map((f) => {
      const hot = ['attack', 'conquer', 'chase'].includes(f.order?.kind);
      const dry = fuelAt(f, me.race, now) < DRY;
      return `<button class="mf${hot ? ' hot' : ''}${dry ? ' dry' : ''}" data-fleet="${esc(f.id)}">
        <span class="mf-top"><strong>${esc(fleetName(f))}</strong><span class="mf-clock"></span></span>
        <span class="mf-ships">${shipIcons(f.ships)}</span>
        <span class="mf-status">${esc(fleetStatus(me.race, f, now))}</span></button>`;
    })
    .join('');
  const html = planetHtml + fleetHtml;
  if (box.dataset.html !== html) {
    box.innerHTML = html;
    box.dataset.html = html;
  }
  for (const b of box.children) {
    if (b.dataset.planet) {
      const pl = planets.find((x) => x.key === b.dataset.planet);
      const s = pl && stateAt(pl.planet, now);
      const job = s?.yard;
      b.querySelector('.mf-clock').textContent = job ? clock(Math.max(0, job.end - now)) : '';
      const gbox = b.querySelector('.mp-gauges');
      if (s && gbox) {
        const gs = stockFill(me.race, s);
        for (const g of gs) {
          const bar = gbox.querySelector(`[data-g="${g.res}"] b`);
          if (bar) bar.style.width = `${(g.k * 100).toFixed(1)}%`;
        }
        const label = `Stocks : ${gs.map((g) => `${GAUGE_NAMES[g.res].toLowerCase()} ${fillWord(g.k)}`).join(', ')}`;
        if (gbox.getAttribute('aria-label') !== label) gbox.setAttribute('aria-label', label);
      }
      continue;
    }
    const f = fleets.find((x) => x.id === b.dataset.fleet);
    b.setAttribute('aria-pressed', String(b.dataset.fleet === etat.selFleet));
    b.querySelector('.mf-clock').textContent = f && moving(f, now) ? clock(f.arrive - now) : '';
  }
}
