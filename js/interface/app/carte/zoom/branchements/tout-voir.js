import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { clampZoom } from '../clamp-zoom.js';
import { zoom } from '../zoom.js';

$('btn-zoom-fit').onclick = () => {
  closeMenu();
  zoom.z = 1;
  clampZoom();
};
