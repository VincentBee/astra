import { $ } from '../../outils/dollar.js';
import { etat } from '../../etat.js';
import { stateAt } from '../../../../regles/game/index.js';

/** Règle d'achat automatique (D-530) de la planète ouverte dans la fiche de la carte. */
export function pickAutoRule() {
  const key = $('btn-open-planet').dataset.key;
  const me = etat.session?.state?.players[etat.session.me];
  const pl = me && etat.session.planetOf(me, key);
  return { key, rule: pl ? stateAt(pl.planet, etat.session.now()).auto : null };
}
