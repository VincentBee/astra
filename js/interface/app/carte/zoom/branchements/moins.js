import { $ } from '../../../outils/dollar.js';
import { closeMenu } from '../../menu/close-menu.js';
import { zoomCenter } from '../zoom-center.js';

$('btn-zoom-out').onclick = () => (closeMenu(), zoomCenter(1 / 1.6));
