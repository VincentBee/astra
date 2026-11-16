import { raceIcon } from '../../../game.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

/** Ce qu'ont choisi les autres, pour se décider. */
export function renderRaceOthers() {
  if (!etat.session?.state) return;
  const others = etat.session.roster.filter((p) => p.id !== etat.session.me);
  $('race-others').innerHTML = others
    .map((p) => `<span class="other">${p.race ? raceIcon(p.race) : ''}${esc(p.name)}</span>`)
    .join('');
}
