import { $ } from '../../../outils/dollar.js';
import { pickAutoRule } from '../pick-auto-rule.js';
import { AUTO_STEPS } from '../auto-steps.js';
import { etat } from '../../../etat.js';

$('btn-pi-auto-more').onclick = () => {
  const { key, rule } = pickAutoRule();
  const n = rule && AUTO_STEPS.find((x) => x > rule.n);
  if (n) etat.session.setAutoShips(rule.ship, n, key);
};
