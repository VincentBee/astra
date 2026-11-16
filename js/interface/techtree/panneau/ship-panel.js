import { TECHS, SHIPS, shipUnlock, TEMPO } from '../../../regles/tech/index.js';
import { ROLES } from '../donnees/roles.js';
import { etat } from '../etat.js';
import { cost } from '../outils/cost.js';
import { esc } from '../outils/esc.js';
import { num } from '../outils/num.js';

export function shipPanel(type) {
  const s = SHIPS[etat.race][type];
  const u = shipUnlock(etat.race, type);
  const by = u ? `${TECHS[etat.race][u.key].name}${u.level > 1 ? ` niv. ${u.level}` : ''}` : '—';
  return `
    <div class="kind">Vaisseau · ${ROLES[type]}</div>
    <h3>${esc(s.name)}</h3>
    <p>Débloqué par ${esc(by)}.</p>
    <dl>
      <dt>Attaque</dt><dd>${s.attack}</dd>
      <dt>Coque</dt><dd>${s.hull}</dd>
      <dt>Soute</dt><dd>${num(s.cargo)}</dd>
      <dt>Vitesse</dt><dd>${+(s.speed * TEMPO).toFixed(1)} cases/min</dd>
      <dt>Autonomie</dt><dd>${Math.round(s.tank / s.burn)} cases</dd>
      <dt>Coût</dt><dd>${cost(s.cost)}</dd>
    </dl>`;
}
