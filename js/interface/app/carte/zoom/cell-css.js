import { UNIVERSE } from '../../../../game.js';
import { $ } from '../../outils/dollar.js';
import { zoom } from './zoom.js';

/** Taille d'une case à l'écran, en pixels CSS, zoom compris. */
export const cellCss = () => ($('map').getBoundingClientRect().width * zoom.z) / UNIVERSE.w;
