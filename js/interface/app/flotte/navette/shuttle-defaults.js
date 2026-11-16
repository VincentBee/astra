import { stateAt } from '../../../../regles/game/index.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { shuttleRes } from './shuttle-res.js';

/** Coche par défaut les ressources que A a en stock (toutes s'il n'a rien), D-550. */
export function shuttleDefaults() {
  const me = etat.session.state.players[etat.session.me];
  const pl = etat.session.planetsOf(me).find((x) => `${x.cell.x}:${x.cell.y}` === $('shuttle-a').value);
  const s = pl && stateAt(pl.planet, etat.session.now());
  const has = shuttleRes(me.race).filter((r) => (s?.stock[r] || 0) >= 1);
  for (const el of document.querySelectorAll('[data-shres]')) el.checked = has.length ? has.includes(el.dataset.shres) : true;
}
