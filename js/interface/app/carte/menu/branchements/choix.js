import { etat } from '../../../etat.js';
import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../close-menu.js';

$('map-menu').addEventListener('click', (e) => {
  if (e.target.closest('[data-mm-close]')) return closeMenu();
  const o = etat.menu?.items[Number(e.target.closest('[data-mm]')?.dataset.mm)];
  if (!o) return;
  closeMenu();
  o.run();
});
