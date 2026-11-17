import { moving } from '../../../../regles/fleet/index.js';
import { RES_INFO, resIcon, sameCell } from '../../../../regles/game/index.js';
import { ic } from '../../../icons/index.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { esc } from '../../outils/esc.js';
import { shuttleDefaults } from './shuttle-defaults.js';
import { shuttleRes } from './shuttle-res.js';
import { shuttleText } from './shuttle-text.js';

/** Fenêtre Navette (D-556) de la flotte sélectionnée : A, B, ressources ; réglages actuels si elle tourne déjà. */
export function openShuttleSheet() {
  const me = etat.session.state.players[etat.session.me];
  const f = etat.session.myFleet(etat.selFleet);
  if (!f) return;
  etat.shuttleSheet = f.id;
  const mine = etat.session.planetsOf(me);
  const o = f.order?.kind === 'shuttle' ? f.order : null;
  const opt = (pl) => `<option value="${pl.cell.x}:${pl.cell.y}">${esc(pl.name)}</option>`;
  $('shuttle-a').innerHTML = mine.map(opt).join('');
  $('shuttle-b').innerHTML = mine.map(opt).join('');
  // Par défaut : A, la planète où elle attend (ou d'où elle vient) ; B, une autre.
  const now = etat.session.now();
  const here = !moving(f, now) && mine.find((pl) => sameCell(pl.cell, f.to));
  const from = o ? mine.find((pl) => sameCell(pl.cell, o.a)) : here || etat.session.planetOf(me, f.origin) || mine[0];
  const to = o ? mine.find((pl) => sameCell(pl.cell, o.b)) : mine.find((pl) => pl !== from);
  if (from) $('shuttle-a').value = `${from.cell.x}:${from.cell.y}`;
  if (to) $('shuttle-b').value = `${to.cell.x}:${to.cell.y}`;
  $('shuttle-res').innerHTML = shuttleRes(me.race)
    .map((r) => `<label><input type="checkbox" data-shres="${r}">${resIcon(r)} ${RES_INFO[r].name}</label>`)
    .join('');
  if (o) for (const el of document.querySelectorAll('[data-shres]')) el.checked = o.res.includes(el.dataset.shres);
  else shuttleDefaults();
  $('shuttle-now').hidden = !o;
  if (o) $('shuttle-now').textContent = shuttleText(f, now);
  $('btn-shuttle-go').innerHTML = `${ic('shuttle')}${o ? 'Changer la navette' : 'Lancer la navette'}`;
  $('btn-shuttle-stop').hidden = !o;
  $('sheet-shuttle').hidden = false;
}
