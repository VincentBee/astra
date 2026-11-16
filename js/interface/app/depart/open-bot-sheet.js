import { editableBot } from '../../../ia/bot/index.js';
import { RACE_KEYS, raceIcon, RACES } from '../../../regles/game/index.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';

export function openBotSheet(pid) {
  if (!editableBot(etat.session, pid)) return;
  const p = etat.session.state.players[pid];
  etat.botSheet = pid;
  etat.botRace = p.race || RACE_KEYS[0];
  $('bot-title').textContent = p.name;
  $('bot-name').value = p.name;
  $('bot-races').innerHTML = RACE_KEYS.map(
    (k) => `<button type="button" class="race" role="radio" aria-checked="${k === etat.botRace}" data-botrace="${k}" style="--race:${RACES[k].color}">
      ${raceIcon(k)}<span class="race-name">${RACES[k].name}</span>
    </button>`,
  ).join('');
  $('sheet-bot').hidden = false;
}
