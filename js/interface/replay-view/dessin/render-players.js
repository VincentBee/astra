import { RACES, raceIcon, stateAt } from '../../../regles/game/index.js';
import { countShips } from '../../../regles/fleet/index.js';
import { etat } from '../etat.js';
import { ptsAt } from '../film/pts-at.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';

export function renderPlayers(players) {
  $('rp-players').innerHTML = players
    .sort((a, b) => a.rank - b.rank)
    .map((p) => {
      const R = RACES[p.race];
      const planets = (p.planet && p.home ? 1 : 0) + Object.keys(p.colonies || {}).length;
      const docked = countShips(p.planet?.ships || {}) + Object.values(p.colonies || {}).reduce((n, c) => n + countShips(c.ships || {}), 0);
      const flying = (p.fleets || []).reduce((n, f) => n + countShips(f.ships), 0);
      const s = p.planet ? stateAt(p.planet, Math.max(etat.t, p.planet.at)) : null;
      const sub = p.planet
        ? `${planets} planète${planets > 1 ? 's' : ''} · ${docked + flying} vaisseaux (${flying} en vol) · ${Math.floor(s.stock.minerals)} minéraux`
        : p.race
          ? 'choisit sa planète'
          : 'choisit sa race';
      return `<div class="player card">
        <span class="dot" style="background:${esc(p.color)}"></span>
        <div class="p-main">
          <div class="p-name">${esc(p.name)}${R ? ` <span class="tag race-tag" style="--race:${R.color}">${raceIcon(p.race)} ${R.name}</span>` : ''}</div>
          <div class="p-sub mono">${esc(sub)}</div>
        </div>
        <div class="p-score mono">${p.race ? `${ptsAt(p.id, etat.t) ?? 0} pts` : ''}</div>
      </div>`;
    })
    .join('');
}
