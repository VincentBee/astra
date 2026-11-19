import { $ } from '../../../outils/dollar.js';
import { setRelief } from '../set-relief.js';

// Réglages : la case « Carte en 3D » (D-563).
$('relief').onchange = () => setRelief($('relief').checked);
