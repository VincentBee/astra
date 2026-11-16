import { fuelAt } from '../../../fleet.js';
import { fmt, RES_INFO, SOIL } from '../../../game.js';
import { ic } from '../../../icons.js';
import { SHIP_KEYS, SHIPS } from '../../../tech.js';
import { etat } from '../etat.js';
import { fleetName } from '../flotte/fleet-name.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

/** Fenêtre « Donner » (vers une autre de mes flottes) ou « Scinder » (vers une nouvelle). */
export function openMoveSheet(kind, to = null) {
  const me = etat.session.state.players[etat.session.me];
  const f = etat.session.myFleet(etat.selFleet);
  const target = to && etat.session.myFleet(to);
  if (!f || (kind === 'give' && !target)) return;
  etat.moveSheet = { kind, from: f.id, to };
  const now = etat.session.now();
  $('move-title').textContent = kind === 'give' ? `${fleetName(f)} → ${fleetName(target)}` : `Scinder la ${fleetName(f).toLowerCase()}`;
  $('move-hint').textContent =
    kind === 'give'
      ? 'Ce que la flotte sélectionnée donne à l’autre. Il doit lui rester au moins un vaisseau, et les soutes et réservoirs de chacune doivent suffire.'
      : 'Ce qui part former une nouvelle flotte, au même endroit. Chacune garde au moins un vaisseau.';
  $('move-ships').innerHTML = SHIP_KEYS.filter((k) => f.ships[k])
    .map((k) => `<label>${esc(SHIPS[me.race][k].name)} (${f.ships[k]})<input type="number" inputmode="numeric" min="0" max="${f.ships[k]}" value="0" data-mship="${k}"></label>`)
    .join('');
  const fuel = Math.floor(fuelAt(f, me.race, now));
  $('move-load').innerHTML =
    SOIL.map(
      (r) => `<label>${RES_INFO[r].name} (${fmt(f.cargo?.[r] || 0)})<input type="number" inputmode="numeric" min="0" max="${f.cargo?.[r] || 0}" value="0" data-mcargo="${r}"></label>`,
    ).join('') + `<label>Carburant (${fuel})<input type="number" inputmode="numeric" min="0" max="${fuel}" value="0" data-mfuel></label>`;
  $('btn-move-go').innerHTML = kind === 'give' ? ic('give') + 'Donner' : ic('split') + 'Scinder';
  $('sheet-move').hidden = false;
}
