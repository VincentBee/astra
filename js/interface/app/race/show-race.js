import { RACE_KEYS, raceIcon, RACES } from '../../../game.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { show } from '../outils/show.js';
import { renderRaceOthers } from './render-race-others.js';
import { updateRacePick } from './update-race-pick.js';

export function showRace() {
  etat.pickedRace = RACE_KEYS[0];
  $('races').innerHTML = RACE_KEYS.map(
    (k) => `<button class="race" role="radio" aria-checked="false" data-race="${k}" style="--race:${RACES[k].color}">
      ${raceIcon(k)}<span class="race-name">${RACES[k].name}</span>
    </button>`,
  ).join('');
  updateRacePick();
  renderRaceOthers();
  show('race');
}
