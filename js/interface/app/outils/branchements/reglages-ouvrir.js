import { skyMode } from '../../../galaxy/index.js';
import { reliefNote } from '../../carte/relief/relief-note.js';
import { relief } from '../../carte/relief/relief.js';
import { $ } from '../dollar.js';

// Réglages de l'appareil : une fenêtre, ouverte par la roue crantée (accueil et jeu).
for (const btn of document.querySelectorAll('[data-settings]')) {
  btn.onclick = () => {
    $('sky').value = skyMode();
    $('relief').checked = relief.on;
    reliefNote();
    $('sheet-settings').hidden = false;
  };
}
