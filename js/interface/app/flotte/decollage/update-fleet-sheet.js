import { countShips, fleetBurn, fleetCargo, fleetTank } from '../../../../regles/fleet/index.js';
import { fmt } from '../../../../regles/game/index.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { speedText } from '../speed-text.js';
import { fleetChoice } from './fleet-choice.js';

export function updateFleetSheet() {
  const me = etat.session.state.players[etat.session.me];
  const { ships } = fleetChoice();
  const speed = speedText(me.race, ships, me.planet?.tech);
  $('fleet-room').textContent = `Soutes : ${fmt(fleetCargo(me.race, ships))}${speed ? ` · ${speed[0].toUpperCase()}${speed.slice(1)}` : ''}`;
  const tank = fleetTank(me.race, ships);
  const burn = fleetBurn(me.race, ships);
  const input = $('fleet-fuel');
  const fuel = Math.min(Math.max(0, Math.floor(Number(input.value) || 0)), tank, Number(input.dataset.max) || 0);
  if (Number(input.value) !== fuel) input.value = fuel;
  $('fleet-tank').textContent = burn
    ? `Réservoirs : ${fmt(tank)} · ${String(burn).replace('.', ',')} par case · ${Math.floor(fuel / burn)} cases avec ce carburant`
    : '';
  $('btn-fleet-go').disabled = !countShips(ships);
}
