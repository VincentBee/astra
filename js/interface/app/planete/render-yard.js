import { PLAN_MAX, RACES } from '../../../regles/game/index.js';
import { ic } from '../../icons/index.js';
import { SHIP_KEYS, shipDuration, SHIPS, shipStats, shipUnlock, shipUnlocked, TECHS } from '../../../regles/tech/index.js';
import { etat } from '../etat.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { canBuildShips } from './can-build-ships.js';
import { cardProgress } from './card-progress.js';
import { costText } from './cost-text.js';
import { setHtml } from './set-html.js';
import { statText } from './stat-text.js';
import { autoWait } from '../carte/fiche/auto-wait.js';
import { autoButton } from './auto-button.js';

/**
 * Chantier naval de la planète ouverte. Chantier libre, fil vide et stock suffisant : ×1 lance
 * le lot ; sinon il l'ajoute à la fin du fil (+1, D-158, D-420). ×∞ règle ou arrête l'achat
 * automatique de ce vaisseau (D-530, D-534).
 */
export function renderYard(me, pl, s, now, ahead) {
  const yard = s.levels.yard || 0;
  const S = SHIPS[me.race];
  const yardName = RACES[me.race].buildings.yard.name;
  $('yard-hint').textContent = yard ? '' : ahead.levels.yard ? `🔒 Il faut un ${yardName} : il est au fil, les vaisseaux peuvent l’y suivre.` : `🔒 Il faut un ${yardName}.`;
  $('yard-hint').hidden = !!yard;
  // Achat automatique (D-530, D-534) : ×∞ le règle ici aussi ; la taille du lot se règle sur la carte.
  $('yard-auto').hidden = !s.auto;
  $('yard-auto').textContent = s.auto ? `⟳ Achat automatique : ${s.auto.n} × ${S[s.auto.ship].name}, dès que les fonds sont là · ${autoWait(me, s, s.plan || [])}. Taille du lot : fiche de la planète sur la carte.` : '';
  const q = (sel) => document.querySelector(sel);
  for (const k of SHIP_KEYS) {
    const unlocked = shipUnlocked(me.race, k, ahead.tech); // recherche au fil comprise : le lot peut l'y suivre
    const u = shipUnlock(me.race, k);
    const job = s.yard?.type === k ? s.yard : null;
    cardProgress(q(`[data-scard="${k}"]`), job, now);
    q(`[data-sdocked="${k}"]`).textContent = [
      s.ships[k] ? `${s.ships[k]} à quai` : '',
      job ? `+${job.count} · ${clock(Math.max(0, job.end - now))}` : '',
    ].filter(Boolean).join(' · ');
    q(`[data-sstats="${k}"]`).title = 'Attaque · coque · soute · vitesse en cases par minute';
    q(`[data-sstats="${k}"]`).textContent = statText(shipStats(me.race, k, s.tech));
    const req = q(`[data-sreq="${k}"]`);
    req.hidden = unlocked;
    req.textContent = unlocked ? '' : `🔒 ${TECHS[me.race][u.key].name} ${u.level}`;
    setHtml(q(`[data-scost="${k}"]`), `${costText(S[k].cost)} · ${clock(shipDuration(me.race, k, 1, Math.max(1, yard)))}/u`);
    q(`[data-scard="${k}"]`).classList.toggle('locked', !unlocked);
    const plan = s.plan || [];
    const canPlan = !!ahead.levels.yard && unlocked && plan.length < PLAN_MAX && etat.session.status === 'playing';
    for (const btn of document.querySelectorAll(`[data-ship="${k}"]`)) {
      const n = Number(btn.dataset.n);
      const direct = !plan.length && canBuildShips(me, s, k, n); // fil pas vide : à la fin du fil (D-420)
      btn.dataset.mode = direct ? 'now' : 'plan';
      btn.disabled = !(direct || canPlan);
      setHtml(btn, direct ? `×${n}` : `${ic('plus')}${n}`);
      btn.title = direct ? `Construire ${n} ${S[k].name}` : plan.length >= PLAN_MAX ? `Fil plein (${PLAN_MAX} au plus)` : `Ajouter ${n} ${S[k].name} au fil : le lot partira dès que possible`;
      btn.setAttribute('aria-label', btn.title);
    }
    autoButton(q(`[data-auto-ship="${k}"]`), me, s, k, unlocked);
  }
}
