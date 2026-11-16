import { finalBoard } from '../../finish/index.js';
import { fmt, raceIcon, RACES } from '../../../regles/game/index.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

export function showFinish(over, again = false) {
  const key = `${etat.session.state.gid}@${over.at}`;
  if (etat.finishSeen === key && !again) return;
  etat.finishSeen = key;
  const board = finalBoard(etat.session);
  if (!board) return;
  $('finish-board').innerHTML = board.rows
    .map((r) => `<li class="finish-row${r.me ? ' me' : ''}${r.dead && !r.winner ? ' dead' : ''}" data-place="${r.place}">
        <span class="medal${r.medal ? ' ' + r.medal : ''}" title="${r.medal ? { gold: 'Or', silver: 'Argent', bronze: 'Bronze' }[r.medal] : ''}">${r.place}</span>
        <span class="dot" style="background:${esc(r.color)}"></span>
        <div class="f-main">
          <div class="f-name">${esc(r.name)}${r.me ? ' <span class="you">toi</span>' : ''}</div>
          <div class="f-sub">${r.race ? `${raceIcon(r.race)} ${RACES[r.race].name} · ` : ''}${esc(r.status)}</div>
        </div>
        <span class="f-pts">${fmt(r.pts)} pts</span>
      </li>`)
    .join('');
  $('sheet-finish').hidden = false;
}
