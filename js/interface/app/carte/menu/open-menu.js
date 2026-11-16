import { menuPlace } from '../../../../aim.js';
import { ic } from '../../../../icons.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { esc } from '../../outils/esc.js';
import { cellCss } from '../zoom/cell-css.js';
import { zoom } from '../zoom/zoom.js';
import { closeMenu } from './close-menu.js';

/** Ouvre le menu au doigt, sur la carte, à côté du point `at` (en cases). */
export function openMenu(at, items, { title = '', cell = null, fleet = null, foe = null } = {}) {
  if (!items.length) return closeMenu();
  etat.menu = { at, items, title, cell, fleet, foe };
  const box = $('map-menu');
  box.innerHTML =
    `<div class="mm-head"><span>${esc(title)}</span><button class="ghost small icon-only" data-mm-close title="Fermer" aria-label="Fermer">${ic('close')}</button></div>` +
    items.map((o, i) => `<button class="${o.ghost ? 'ghost' : o.primary ? 'primary' : 'secondary'} small" role="menuitem" data-mm="${i}">${ic(o.icon || 'fleet')}${esc(o.label)}</button>`).join('');
  box.hidden = false;
  const canvas = $('map');
  const wrap = box.parentElement;
  const size = cellCss();
  const sx = canvas.offsetLeft + (at.x + 0.5 - zoom.x) * size;
  const sy = canvas.offsetTop + (at.y + 0.5 - zoom.y) * size;
  const pos = menuPlace(sx, sy, box.offsetWidth, box.offsetHeight, wrap.clientWidth, wrap.clientHeight);
  box.style.left = `${pos.x}px`;
  box.style.top = `${pos.y}px`;
  box.querySelector('[data-mm]')?.focus({ preventScroll: true });
}
