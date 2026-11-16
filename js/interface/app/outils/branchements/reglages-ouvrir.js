import { skyMode } from '../../../galaxy/index.js';
import { $ } from '../dollar.js';

// Réglages de l'appareil : une fenêtre, ouverte par la roue crantée (accueil et jeu).
for (const btn of document.querySelectorAll('[data-settings]')) {
  btn.onclick = () => {
    $('sky').value = skyMode();
    $('sheet-settings').hidden = false;
  };
}
