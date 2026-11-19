import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { reliefOn } from '../../relief/relief-on.js';
import { setTilt } from '../set-tilt.js';
import { zoomAt } from '../zoom-at.js';
import { zoom } from '../zoom.js';

$('map').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    closeMenu();
    // Carte en 3D : Maj + molette incline la vue (D-562).
    if (e.shiftKey && reliefOn()) return setTilt(zoom.t + (e.deltaY || e.deltaX) * 0.002);
    const r = e.currentTarget.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  },
  { passive: false },
);
