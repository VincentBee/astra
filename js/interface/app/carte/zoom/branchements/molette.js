import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { zoomAt } from '../zoom-at.js';

$('map').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    closeMenu();
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
