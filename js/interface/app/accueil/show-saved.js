import { ic } from '../../../icons.js';
import { describeSave, listGames } from '../../../save.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { whenText } from './when-text.js';

export function showSaved() {
  const games = listGames();
  $('saved').hidden = !games.length;
  $('btn-create').className = games.length ? 'secondary' : 'primary';
  $('games').innerHTML = games
    .map((g) => {
      const d = describeSave(g);
      const gid = esc(g.state.gid);
      return `<li class="game-row card">
        <div class="g-main">
          <span class="g-names">${d.names.map((n) => (n === d.me ? `<strong>${esc(n)}</strong>` : esc(n))).join(' · ')}</span>
          <span class="g-when mono">${whenText(d.savedAt)}</span>
        </div>
        <button class="primary icon-only" data-resume="${gid}" title="Reprendre" aria-label="Reprendre la partie">${ic('play')}</button>
        <button class="secondary icon-only" data-replay="${gid}" title="Revoir" aria-label="Revoir la partie">${ic('replay')}</button>
        <button class="ghost icon-only" data-forget="${gid}" title="Oublier" aria-label="Oublier la partie">${ic('close')}</button>
      </li>`;
    })
    .join('');
}
