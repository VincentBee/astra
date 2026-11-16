import { $ } from '../../../outils/dollar.js';
import { pickAutoRule } from '../pick-auto-rule.js';
import { AUTO_STEPS } from '../auto-steps.js';
import { etat } from '../../../etat.js';

$('btn-pi-auto-less').onclick = () => {
  const { key, rule } = pickAutoRule();
  const n = rule && AUTO_STEPS.findLast((x) => x < rule.n);
  if (n) etat.session.setAutoShips(rule.ship, n, key);
};
