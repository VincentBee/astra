import { covers, PLAN_MAX, RACES } from '../../../game.js';
import { ic } from '../../../icons.js';
import { researchDuration, techCost, techMissing, TECHS } from '../../../tech.js';
import { etat } from '../etat.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { cardProgress } from './card-progress.js';
import { costText } from './cost-text.js';
import { setHtml } from './set-html.js';

/**
 * Arbre des technologies : sur toute planète qui a un labo, avec le niveau de ce labo.
 * Labo libre, fil vide et stock suffisant : le bouton lance (↑). Sinon il ajoute au fil (+),
 * en comptant ce qui y est déjà (`ahead`, D-158) : fil pas vide, la recherche va à sa fin (D-420).
 */
export function renderResearch(me, pl, s, now, ahead) {
  const lab = s.levels.lab || 0;
  const labAhead = ahead.levels.lab || 0;
  const plan = s.plan || [];
  // Recherches lancées (ou au fil) sur mes autres planètes : la même technologie ne peut pas y être lancée ici.
  const elsewhere = {};
  for (const x of etat.session.planetsOf(me)) {
    if (x.key === pl.key) continue;
    if (x.planet.research) elsewhere[x.planet.research.key] = x.name;
    for (const it of x.planet.plan || []) if (it?.tech) elsewhere[it.tech] = x.name;
  }
  const T = TECHS[me.race];
  const labName = RACES[me.race].buildings.lab.name;
  $('research-hint').textContent = lab ? '' : labAhead ? `🔒 Il faut un ${labName} : il est au fil, les recherches peuvent l’y suivre.` : `🔒 Il faut un ${labName}.`;
  $('research-hint').hidden = !!lab;
  const q = (sel) => document.querySelector(sel);
  const playing = etat.session.status === 'playing';
  for (const [k, t] of Object.entries(T)) {
    const level = s.tech[k] || 0;
    const next = ahead.tech[k] || 0; // niveau une fois fini ce qui est lancé et au fil
    const maxed = level >= t.max;
    const maxedAhead = next >= t.max;
    const miss = techMissing(me.race, k, ahead.tech, labAhead);
    const cost = techCost(me.race, k, next);
    const there = elsewhere[k];
    const job = s.research?.key === k ? s.research : null;
    const direct = !s.research && !plan.length && !maxed && !miss && !!lab && covers(s.stock, cost) && !there;
    const canPlan = !maxedAhead && !miss && !!labAhead && !there && plan.length < PLAN_MAX;
    q(`[data-tlevel="${k}"]`).textContent = job ? `niv ${level} → ${job.level} · ${clock(Math.max(0, job.end - now))}` : `niv ${level}/${t.max}`;
    const req = q(`[data-treq="${k}"]`);
    req.hidden = !miss || maxedAhead;
    req.textContent = miss ? `🔒 ${miss}` : '';
    setHtml(q(`[data-tcost="${k}"]`), maxedAhead ? (maxed ? 'Niveau maximum' : 'Niveau maximum (fil compris)') : `${costText(cost)} · ${clock(researchDuration(cost, Math.max(1, labAhead)))}`);
    q(`[data-tcard="${k}"]`).classList.toggle('locked', !!miss && !maxedAhead);
    q(`[data-tcard="${k}"]`).classList.toggle('affordable', direct);
    q(`[data-tcard="${k}"]`).classList.toggle('building-now', !!job);
    const btn = q(`[data-research="${k}"]`);
    btn.dataset.mode = direct ? 'now' : 'plan';
    btn.disabled = !(direct || canPlan) || !playing;
    cardProgress(q(`[data-tcard="${k}"]`), job, now);
    setHtml(btn, maxed ? ic('done') : `${ic(direct ? 'up' : 'plus')}${next + 1}`);
    btn.title = maxed
      ? 'Terminé'
      : maxedAhead
        ? 'Niveau maximum, fil compris'
        : there
          ? `En recherche ou au fil sur ${there}`
          : miss
            ? `Il faut : ${miss}`
            : !labAhead
              ? `Il faut un ${labName}`
              : direct
                ? `Rechercher le niveau ${next + 1}`
                : plan.length >= PLAN_MAX
                  ? `Fil plein (${PLAN_MAX} au plus)`
                  : `Ajouter le niveau ${next + 1} au fil : il se lancera dès que possible`;
    btn.setAttribute('aria-label', `${t.name} : ${btn.title.toLowerCase()}`);
  }
}
