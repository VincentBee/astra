import { mapVeiled } from '../../carte/map-veiled.js';
import { $ } from '../../outils/dollar.js';
import { renderLive } from '../../partie/render-live.js';

// Fenêtre des joueurs : qui est en ligne, le classement, et inviter. Cachée en préparation (D-310).
$('net').onclick = () => {
  if (mapVeiled()) return; // en préparation, le lobby tient ce rôle (D-310)
  $('sheet-players').hidden = false;
  renderLive();
};
