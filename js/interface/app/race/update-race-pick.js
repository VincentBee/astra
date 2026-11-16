import { RACES, RES_INFO, resIcon } from '../../../game.js';
import { ic } from '../../../icons.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

/** La race choisie est cochée, et seule sa fiche s'affiche. */
export function updateRacePick() {
  for (const el of document.querySelectorAll('[data-race]')) el.setAttribute('aria-checked', String(el.dataset.race === etat.pickedRace));
  const R = RACES[etat.pickedRace];
  const res = R.resources.map((r) => `<span class="chip ${r}">${resIcon(r)}${RES_INFO[r].name}</span>`).join('');
  $('race-detail').style.setProperty('--race', R.color);
  $('race-detail').innerHTML = `<p class="race-pitch">${esc(R.pitch)}</p>
    <ul class="race-traits">${R.traits.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <span class="chips">${res}${R.pop ? `<span class="chip pop">${resIcon('pop', R.pop.label)}${R.pop.label}</span>` : '<span class="chip none">Sans population</span>'}</span>`;
  // La partie part ensuite, quand tous les joueurs présents sont prêts (D-120).
  $('btn-race').innerHTML = `${ic('check')}Choisir cette race`;
}
