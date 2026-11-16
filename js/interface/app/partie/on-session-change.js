import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { show } from '../outils/show.js';
import { renderState } from '../planete/render-state.js';
import { renderRaceOthers } from '../race/render-race-others.js';
import { joinError } from '../rejoindre/join-error.js';
import { startGame } from './start-game.js';

export function onSessionChange(what, why) {
  const s = etat.session;
  if (!s) return;
  if (why === 'record' && s.status === 'playing' && !$('screen-game').hidden) {
    if (!etat.stateFrame) {
      etat.stateFrame = requestAnimationFrame(() => {
        etat.stateFrame = 0;
        if (etat.session === s && !$('screen-game').hidden) renderState();
      });
    }
    return;
  }
  if (s.status === 'waiting') {
    $('join-status').textContent = 'Connecté. Arrivée dans la partie…';
  }
  if (s.status === 'failed') {
    $('join-step-1').hidden = false;
    $('join-step-2').hidden = true;
    joinError(`${s.failure} Demande une nouvelle invitation à n’importe quel joueur et scanne-la.`);
    show('join');
  }
  if (s.status === 'refused') {
    joinError(s.refusal || 'Ta demande a été refusée.');
    $('join-status').textContent = '';
    show('join');
  }
  if (s.status === 'playing' && $('screen-game').hidden && $('screen-race').hidden) startGame();
  if (!$('screen-race').hidden) renderRaceOthers();
  if (!$('screen-game').hidden) renderState();
}
