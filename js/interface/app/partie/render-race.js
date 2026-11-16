import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { setHtml } from '../planete/set-html.js';
import { showFinish } from './show-finish.js';

/**
 * Bandeau de fin (D-201) : visible seulement quand la partie est finie, avec le
 * vainqueur, le bouton Classement et la courbe des points. Pendant la partie et
 * quand je suis éliminé, il reste caché (plus de « Ta planète gèle dans… »).
 */
export function renderRace() {
  const el = $('race');
  const over = etat.session.startedAt != null ? etat.session.over : null;
  el.hidden = !over;
  if (!over) return;
  const players = etat.session.state.players;
  const mine = over.winner === etat.session.me;
  const what = mine ? 'Victoire !' : over.winner == null ? 'Perdu.' : `${esc(players[over.winner].name)} gagne.`; // seul : personne ne gagne (D-142)
  el.classList.toggle('hot', !mine);
  setHtml($('race-text'), `<strong>${what}</strong> <span class="hint">· partie finie ·</span> <button type="button" class="race-link" data-finish>Classement</button> <span class="hint">·</span> <a href="replay.html#points" class="race-link">Voir la courbe des points</a>`);
  showFinish(over);
}
