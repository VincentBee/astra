import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { setTilt } from '../set-tilt.js';
import { zoomAt } from '../zoom-at.js';
import { zoom } from '../zoom.js';

$('map').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    closeMenu();
    // Maj + molette : incliner la vue (D-562).
    if (e.shiftKey) return setTilt(zoom.t + (e.deltaY || e.deltaX) * 0.002);
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
