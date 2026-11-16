import { SHIPS } from '../../../regles/tech/index.js';
import { etat } from '../etat.js';

/**
 * Bouton ×∞ d'un vaisseau (D-534, à la place de ×5) : enfoncé quand la règle d'achat
 * automatique vise ce vaisseau ; le toucher la règle, le retoucher l'arrête.
 */
export function autoButton(btn, me, s, k, unlocked) {
  if (!btn) return;
  const on = s.auto?.ship === k;
  const name = SHIPS[me.race][k].name;
  btn.setAttribute('aria-pressed', String(on));
  btn.disabled = etat.session.status !== 'playing' || !unlocked;
  btn.title = on ? `Arrêter l’achat automatique de ${name}` : `Acheter des ${name} en automatique, dès que les fonds sont là (le fil passe d’abord)`;
  btn.setAttribute('aria-label', btn.title);
}
