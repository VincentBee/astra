import { closeMenu } from '../close-menu.js';

// Échap ou un toucher hors de la carte ferment le menu.
document.addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());
