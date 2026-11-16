import { fleetTank } from '../../../../regles/fleet/index.js';
import { fmt, RES_INFO, SOIL, stateAt } from '../../../../regles/game/index.js';
import { SHIP_KEYS, SHIPS } from '../../../../regles/tech/index.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { esc } from '../../outils/esc.js';
import { updateFleetSheet } from './update-fleet-sheet.js';

export function openFleetSheet(key = etat.openKey) {
  const me = etat.session.state.players[etat.session.me];
  const pl = etat.session.planetOf(me, key);
  if (!pl) return;
  etat.fleetKey = key;
  const s = stateAt(pl.planet, etat.session.now());
  $('fleet-ships').innerHTML = SHIP_KEYS.filter((k) => s.ships[k])
    .map((k) => `<label>${esc(SHIPS[me.race][k].name)} (${s.ships[k]})<input type="number" inputmode="numeric" min="0" max="${s.ships[k]}" value="${s.ships[k]}" data-fship="${k}"></label>`)
    .join('');
  $('fleet-cargo').innerHTML = SOIL.map(
    (r) => `<label>${RES_INFO[r].name} (${fmt(s.stock[r])})<input type="number" inputmode="numeric" min="0" value="0" data-fcargo="${r}"></label>`,
  ).join('');
  // Par défaut, le plein (ou toute l'énergie disponible, s'il en manque).
  const energy = Math.floor(s.stock.energy || 0);
  $('fleet-fuel-label').firstChild.textContent = `Énergie (${fmt(energy)})`;
  $('fleet-fuel').dataset.max = energy;
  $('fleet-fuel').value = Math.min(energy, fleetTank(me.race, s.ships));
  $('sheet-fleet').hidden = false;
  updateFleetSheet();
}
