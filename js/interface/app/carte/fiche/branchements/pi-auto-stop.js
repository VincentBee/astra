import { $ } from '../../../outils/dollar.js';
import { pickAutoRule } from '../pick-auto-rule.js';
import { etat } from '../../../etat.js';

$('btn-pi-auto-stop').onclick = () => {
  const { key, rule } = pickAutoRule();
  if (rule) etat.session.setAutoShips(null, 0, key);
};
