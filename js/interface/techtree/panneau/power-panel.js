import { RACES, resIcon, POWERS } from '../../../regles/game/index.js';
import { dur } from '../outils/dur.js';
import { esc } from '../outils/esc.js';
import { num } from '../outils/num.js';

export function powerPanel(key) {
  const P = POWERS[key];
  const c1 = P.cost(1);
  return `
    <div class="kind">Pouvoir psychique</div>
    <h3>${esc(P.name)}</h3>
    <p>${esc(P.desc)}</p>
    <p>Renforcé par l’${esc(RACES.alien.buildings.amplifier.name.toLowerCase())} : +25 % par niveau.</p>
    <dl>
      <dt>Coût</dt><dd><span class="qty">${num(c1.energy)}${resIcon('energy')}</span> par psionique</dd>
      <dt>Recharge</dt><dd>${dur(P.cooldown)}</dd>
      ${P.duration ? `<dt>Durée</dt><dd>${dur(P.duration)}</dd>` : ''}
    </dl>`;
}
