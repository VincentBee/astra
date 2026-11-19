import { $ } from '../../outils/dollar.js';
import { relief } from './relief.js';

/** Sous la case « Carte en 3D » : téléchargement en cours, ou raté. */
export function reliefNote() {
  const el = $('relief-note');
  if (!el) return;
  const text = !relief.on || relief.mod ? '' : relief.failed ? 'Téléchargement raté (pas de réseau ?) : décoche puis recoche pour réessayer.' : 'Téléchargement des visuels 3D…';
  el.textContent = text;
  el.hidden = !text;
}
