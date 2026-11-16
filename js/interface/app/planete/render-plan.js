import { planForecast, planId, RACES } from '../../../regles/game/index.js';
import { ic } from '../../icons/index.js';
import { SHIPS, TECHS } from '../../../regles/tech/index.js';
import { etat } from '../etat.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { setHtml } from './set-html.js';

export function renderPlan(me, pl, planet, now) {
  const el = $('plan');
  const key = [pl.key, planet.at, JSON.stringify(planet.plan || []), planet.queue?.end, planet.research?.end, planet.yard?.end, Math.floor(now / 1000)].join('|');
  if (etat.planCache.key !== key) etat.planCache = { key, list: planForecast(planet, now) };
  const list = etat.planCache.list;
  $('plan-zone').hidden = !list.length;
  const R = RACES[me.race];
  // « Mine niv 5 », « Armes niv 2 » (icône recherche), « 5 × Chasseur » (icône flotte).
  const label = (f) =>
    f.lane === 'queue'
      ? `${esc(R.buildings[f.key].short || R.buildings[f.key].name)} <span class="level mono">niv ${f.level}</span>`
      : f.lane === 'research'
        ? `${ic('research')}${esc(TECHS[me.race][f.key].name)} <span class="level mono">niv ${f.level}</span>`
        : `${ic('fleet')}${f.count} × ${esc(SHIPS[me.race][f.key].name)}`;
  const longName = (f) => (f.lane === 'queue' ? R.buildings[f.key].name : f.lane === 'research' ? `la recherche ${TECHS[me.race][f.key].name}` : `${f.count} ${SHIPS[me.race][f.key].name}`);
  const when = (f) => {
    if (f.start == null) return f.why || 'plus de 6 h';
    const start = f.start <= now ? 'maintenant' : `dans ${clock(f.start - now)}`;
    return `${start} → fini dans ${clock(Math.max(0, f.end - now))}`;
  };
  // La structure ne change qu'avec le fil (les boutons restent sous le doigt) ; les heures, à chaque tic.
  setHtml(
    el,
    list
      .map(
        (f, i) => `<li class="plan-item">
      <span class="plan-name">${i + 1}. ${label(f)}</span>
      <span class="plan-when mono" title="Estimation, si la production reste la même"></span>
      <button class="ghost small" data-unplan="${i}" data-key="${esc(planId(f.item))}" title="Retirer du fil" aria-label="Retirer ${esc(longName(f))} du fil"${etat.session.canAct ? '' : ' disabled'}>${ic('close')}</button>
    </li>`,
      )
      .join(''),
  );
  el.querySelectorAll('.plan-item').forEach((li, i) => {
    const f = list[i];
    li.classList.toggle('blocked', f.start == null);
    li.querySelector('.plan-when').textContent = `${f.start == null ? '' : '≈ '}${when(f)}`;
  });
}
