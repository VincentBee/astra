import { $ } from '../../../outils/dollar.js';
import { BASSIN } from '../../bassin/bassin.js';
import { closeMenu } from '../../menu/close-menu.js';
import { setTilt } from '../set-tilt.js';
import { zoom } from '../zoom.js';

// Bouton « Incliner » (D-562) : passe au cran suivant (de biais, très penché, de dessus).
$('btn-tilt').onclick = () => {
  closeMenu();
  const list = BASSIN.tilts;
  // Le cran le plus proche de l'inclinaison actuelle (elle a pu être réglée aux doigts), puis le suivant.
  let i = 0;
  list.forEach((t, k) => Math.abs(t - zoom.t) < Math.abs(list[i] - zoom.t) && (i = k));
  setTilt(list[(i + 1) % list.length]);
};
