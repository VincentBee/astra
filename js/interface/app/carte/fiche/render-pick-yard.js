import { countShips } from '../../../../regles/fleet/index.js';
import { PLAN_MAX, planAhead, RACES, shipsAffordable } from '../../../../regles/game/index.js';
import { ic } from '../../../icons/index.js';
import { SHIP_KEYS, shipDuration, SHIPS, shipUnlocked } from '../../../../regles/tech/index.js';
import { etat } from '../../etat.js';
import { clock } from '../../outils/clock.js';
import { $ } from '../../outils/dollar.js';
import { canBuildShips } from '../../planete/can-build-ships.js';
import { costText } from '../../planete/cost-text.js';
import { setHtml } from '../../planete/set-html.js';

/**
 * Chantier et décollage dans la fiche d'une de mes planètes, sur la carte. Même logique que
 * l'onglet de la planète (renderYard, D-312) : chantier libre, fil vide et stock suffisant →
 * le bouton lance le lot ; sinon il l'ajoute à la fin du fil (+1, +5, +N, D-420).
 */
export function renderPickYard(me, pl, s, now) {
  $('pi-yard').hidden = !pl || !s;
  if (!pl || !s) return;
  const yard = s.levels.yard || 0;
  const ahead = planAhead(s); // chantier et recherches au fil compris : le lot peut les y suivre
  const plan = s.plan || [];
  const canPlanHere = !!ahead.levels.yard && plan.length < PLAN_MAX && etat.session.status === 'playing';
  const lots = plan.filter((x) => x?.ship).length;
  const busy = s.yard ? `En chantier : ${s.yard.count} × ${SHIPS[me.race][s.yard.type].name} · ${clock(Math.max(0, s.yard.end - now))}` : '';
  const queued = [lots ? `${lots} lot${lots > 1 ? 's' : ''} de vaisseaux au fil` : '', plan.length >= PLAN_MAX ? `fil plein (${PLAN_MAX} au plus)` : ''].filter(Boolean).join(' · ');
  const yardName = RACES[me.race].buildings.yard.name;
  $('pi-yard-hint').textContent = !yard
    ? ahead.levels.yard ? `🔒 Il faut un ${yardName} : il est au fil, les vaisseaux peuvent l’y suivre.` : `🔒 Il faut un ${yardName}.`
    : [busy, queued].filter(Boolean).join(' · ');
  $('pi-yard-hint').hidden = !$('pi-yard-hint').textContent;
  $('pi-ships').hidden = !ahead.levels.yard;
  for (const k of SHIP_KEYS) {
    const row = document.querySelector(`[data-piship="${k}"]`);
    const unlocked = shipUnlocked(me.race, k, ahead.tech);
    row.hidden = !unlocked; // seulement ce que cette planète sait construire (recherche au fil comprise)
    if (!unlocked) {
      for (const btn of row.querySelectorAll('[data-pi-ship]')) btn.disabled = true;
      continue;
    }
    const max = shipsAffordable(me.race, k, s.stock);
    row.classList.toggle('affordable', max >= 1);
    setHtml(document.querySelector(`[data-picost="${k}"]`), `${costText(SHIPS[me.race][k].cost)} · ${clock(shipDuration(me.race, k, 1, Math.max(1, yard)))}/u`);
    document.querySelector(`[data-pinote="${k}"]`).textContent = [s.ships[k] ? `${s.ships[k]} à quai` : '', `jusqu’à ${max}`].filter(Boolean).join(' · ');
    const name = SHIPS[me.race][k].name;
    for (const btn of row.querySelectorAll('[data-pi-ship]')) {
      const isMax = btn.dataset.n === 'max';
      const n = isMax ? max : Number(btn.dataset.n);
      const direct = !plan.length && canBuildShips(me, s, k, n); // fil pas vide : à la fin du fil (D-420)
      const canPlan = canPlanHere && n >= 1; // Max au fil : autant que le stock en paie maintenant, 0 = rien à mettre
      btn.dataset.mode = direct ? 'now' : 'plan';
      btn.disabled = !(direct || canPlan);
      setHtml(btn, isMax && !n ? 'Max' : direct ? `×${n}` : `${ic('plus')}${n}`);
      btn.title = direct
        ? `Construire ${n} ${name}`
        : plan.length >= PLAN_MAX
          ? `Fil plein (${PLAN_MAX} au plus)`
          : !n
            ? `Stock insuffisant pour un ${name}`
            : `Ajouter ${n} ${name} au fil : le lot partira dès que possible`;
      btn.setAttribute('aria-label', btn.title);
    }
  }
  if (yard && !busy && !SHIP_KEYS.some((k) => shipUnlocked(me.race, k, ahead.tech))) {
    $('pi-yard-hint').textContent = 'Aucun vaisseau recherché pour l’instant : lance une recherche.';
    $('pi-yard-hint').hidden = false;
  }
  $('btn-pi-takeoff').hidden = !countShips(s.ships);
  $('btn-pi-takeoff').dataset.key = pl.key;
}
