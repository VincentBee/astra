import { countShips } from '../../../fleet.js';
import { ic } from '../../../icons.js';
import { etat } from '../etat.js';
import { fleetName } from '../flotte/fleet-name.js';
import { fuelText } from '../flotte/fuel-text.js';
import { $ } from '../outils/dollar.js';
import { esc } from '../outils/esc.js';

/** Mes autres flottes arrêtées sur la même case : leur donner une partie de la mienne, ou les fusionner. */
export function renderBeside(me, f, now) {
  const others = etat.session.fleetsBeside(f.id);
  const html = others
    .map(
      (g) => `<div class="row"><span>${esc(fleetName(g))} · ${countShips(g.ships)} vaisseau${countShips(g.ships) > 1 ? 'x' : ''} · ${esc(fuelText(me.race, g, now))}</span>
        <button class="secondary small" data-give="${esc(g.id)}" title="Donner" aria-label="Donner">${ic('give')}</button>
        <button class="secondary small" data-merge="${esc(g.id)}" title="Fusionner ici" aria-label="Fusionner ici">${ic('merge')}</button></div>`,
    )
    .join('');
  $('fi-beside').hidden = !others.length;
  const full = others.length ? `<p class="hint">Ici :</p>${html}` : '';
  if ($('fi-beside').dataset.html !== full) {
    $('fi-beside').innerHTML = full;
    $('fi-beside').dataset.html = full;
  }
}
