import { $ } from '../../outils/dollar.js';
import { SHIPS } from '../../../../regles/tech/index.js';
import { autoWait } from './auto-wait.js';
import { AUTO_STEPS } from './auto-steps.js';
import { etat } from '../../etat.js';
import { tooBig } from '../../../../regles/game/index.js';
import { shipsCost } from '../../../../regles/game/index.js';
import { autoButton } from '../../planete/auto-button.js';
import { shipUnlocked } from '../../../../regles/tech/index.js';

/**
 * Achat automatique (D-530) dans la fiche d'une de mes planètes : la règle en cours et ses
 * boutons (− et + pour la taille du lot, Arrêter), et le bouton « Auto » de chaque vaisseau,
 * enfoncé pour celui de la règle.
 */
export function renderPickAuto(me, s, plan, ahead) {
  const rule = s.auto;
  $('pi-auto').hidden = !rule;
  if (rule) {
    $('pi-auto-text').textContent = `${rule.n} × ${SHIPS[me.race][rule.ship].name} en automatique, dès que les fonds sont là · ${autoWait(me, s, plan)}`;
    $('btn-pi-auto-less').disabled = rule.n <= AUTO_STEPS[0] || etat.session.status !== 'playing';
    const more = AUTO_STEPS.find((x) => x > rule.n);
    // Pas de lot plus cher que l'entrepôt (fil compris) : il ne partirait jamais.
    $('btn-pi-auto-more').disabled = !more || !!tooBig(me.race, ahead.levels, shipsCost(me.race, rule.ship, more)) || etat.session.status !== 'playing';
    $('btn-pi-auto-stop').disabled = etat.session.status !== 'playing';
  }
  for (const btn of document.querySelectorAll('[data-pi-auto]')) autoButton(btn, me, s, btn.dataset.piAuto, shipUnlocked(me.race, btn.dataset.piAuto, ahead.tech));
}
