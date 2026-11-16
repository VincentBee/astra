import { moving } from '../../../fleet.js';
import { SHIP_KEYS, SHIPS } from '../../../tech.js';
import { clock } from '../outils/clock.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';
import { fleetName } from './fleet-name.js';
import { fleetStatus } from './fleet-status.js';
import { fuelText } from './fuel-text.js';
import { shipsLine } from './ships-line.js';

/** Vaisseaux à quai et flottes. */
export function renderFleets(me, pl, s, now) {
  const docked = SHIP_KEYS.filter((k) => s.ships[k]).map((k) => `${s.ships[k]} × ${SHIPS[me.race][k].name}`);
  $('docked').textContent = docked.length ? `À quai : ${docked.join(', ')}.` : 'Aucun vaisseau à quai sur cette planète.';
  $('btn-send-fleet').hidden = !docked.length;
  const html = (me.fleets || [])
    .map((f) => {
      const left = moving(f, now) ? clock(f.arrive - now) : '';
      return `<div class="player card" data-fleet="${esc(f.id)}"><div class="p-main"><div class="p-name">${esc(`${fleetName(f)} · ${fleetStatus(me.race, f, now)}`)}</div>
        <div class="p-sub mono">${shipsLine(me.race, f)} · ${fuelText(me.race, f, now)}</div></div>
        <div class="p-score mono">${left}</div></div>`;
    })
    .join('');
  if ($('fleets').dataset.html !== html) {
    $('fleets').innerHTML = html;
    $('fleets').dataset.html = html;
  }
}
