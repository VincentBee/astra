import { RACES, RACE_KEYS, raceIcon } from '../../../regles/game/index.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';

export function renderTabs() {
  $('tabs').innerHTML = RACE_KEYS.map((r) => {
    const R = RACES[r];
    return `<button role="tab" data-race="${r}" aria-selected="${r === etat.race}" style="--c:${R.color}">${raceIcon(r)}${esc(R.name)}</button>`;
  }).join('');
}
