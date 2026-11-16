import { raceIcon, RACES } from '../../../game.js';
import { etat } from '../etat.js';
import { printLog } from '../journal/print-log.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { renderLive } from '../partie/render-live.js';

/** Rendu des parties qui changent avec l'état (joueurs, journal, demandes). */
export function renderState() {
  if (etat.stateFrame) {
    cancelAnimationFrame(etat.stateFrame);
    etat.stateFrame = 0;
  }
  globalThis.astraStats.renders++;
  const st = etat.session.state;
  const me = st.players[etat.session.me];
  if (me) {
    $('me-name').textContent = me.name;
    $('me-dot').style.background = me.color;
  }
  $('me-role').innerHTML = me?.race ? `${raceIcon(me.race)} ${RACES[me.race].name}` : 'Commandant';
  $('me-role').style.setProperty('--race', me?.race ? RACES[me.race].color : '');
  $('lost').hidden = !etat.session.alone;


  const players = etat.session.roster;
  $('players').innerHTML = players
    .map(
      (p) => `<div class="player card${p.online ? '' : ' offline'}" data-player="${esc(p.id)}">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${p.id === etat.session.me ? ' <span class="you">toi</span>' : ''}${
            p.race ? ` <span class="tag race-tag" style="--race:${RACES[p.race].color}">${raceIcon(p.race)} ${RACES[p.race].name}</span>` : ''
          }</div>
          <div class="p-sub mono" data-psub="${esc(p.id)}"></div>
        </div>
        <div class="p-score mono" data-pscore="${esc(p.id)}"></div>
      </div>`,
    )
    .join('');

  printLog(st.log);
  renderLive();
}
