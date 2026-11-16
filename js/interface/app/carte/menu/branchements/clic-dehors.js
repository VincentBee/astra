import { etat } from '../../../etat.js';
import { closeMenu } from '../close-menu.js';

document.addEventListener('click', (e) => {
  if (etat.menu && !e.target.closest('#map-menu, #map')) closeMenu();
});
