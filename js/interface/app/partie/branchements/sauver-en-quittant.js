import { etat } from '../../etat.js';

window.addEventListener('pagehide', () => etat.session?.save?.()); // en lecture seule (D-139), `save` ne fait rien
