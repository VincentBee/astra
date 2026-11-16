import { aggressive, armed, countShips, fleetBurn, fleetPos, fleetTank, fuelAt, moving } from '../../../../regles/fleet/index.js';
import { closeMenu } from '../../carte/menu/close-menu.js';
import { refreshMoveSheet } from '../../echanges/refresh-move-sheet.js';
import { renderBeside } from '../../echanges/render-beside.js';
import { renderPartners } from '../../echanges/render-partners.js';
import { etat } from '../../etat.js';
import { clock } from '../../outils/clock.js';
import { $ } from '../../outils/dollar.js';
import { setHtml } from '../../planete/set-html.js';
import { fleetName } from '../fleet-name.js';
import { fleetStatus } from '../fleet-status.js';
import { fuelText } from '../fuel-text.js';
import { shipsLine } from '../ships-line.js';
import { speedText } from '../speed-text.js';

/** Fiche de la flotte sélectionnée : son état et ses ordres (les ordres vers une cible : menu au doigt, D-126). */
export function renderFleetInfo(me = etat.session?.state?.players[etat.session.me], now = etat.session?.now()) {
  if (!etat.session?.state) return;
  refreshMoveSheet();
  let f = etat.selFleet && etat.session.myFleet(etat.selFleet);
  // La flotte choisie s'est fondue dans une autre (jonction, D-159) : on suit celle-ci.
  if (!f && etat.selFleet) f = (me?.fleets || []).find((g) => g.absorbed?.includes(etat.selFleet)) || null;
  if (f) etat.selFleet = f.id;
  if (!f) {
    etat.selFleet = null;
    if (etat.menu?.fleet) closeMenu();
  }
  $('fleet-info').hidden = !f;
  if (!f) return;
  const go = moving(f, now);
  const pos = fleetPos(f, now);
  $('fi-where').textContent = `[${Math.round(pos.x)}:${Math.round(pos.y)}]`;
  setHtml($('fi-ships'), shipsLine(me.race, f));
  $('fi-name').textContent = fleetName(f);
  const speed = speedText(me.race, f.ships, me.planet?.tech);
  $('fi-status').textContent = `${fleetStatus(me.race, f, now)}${go ? ` · ${clock(f.arrive - now)}` : ''}${speed ? ` · ${speed}` : ''}`;
  const here = !go && etat.session.planetsAt(f.to)[0];
  const fuel = fuelAt(f, me.race, now);
  const tank = fleetTank(me.race, f.ships);
  const range = Math.floor(fuel / Math.max(1e-9, fleetBurn(me.race, f.ships)));
  $('fi-fuel').textContent = `${fuelText(me.race, f, now)} · ${range} case${range > 1 ? 's' : ''} d’autonomie`;
  $('fi-fuel-bar').style.width = `${Math.min(100, (fuel / Math.max(1, tank)) * 100)}%`;
  $('fi-fuel').parentElement.classList.toggle('low', fuel < tank * 0.25);
  const mine = here && here.owner.id === etat.session.me;
  $('btn-fi-stop').hidden = !go && f.order?.kind !== 'chase';
  $('btn-fi-dock').hidden = !mine;
  $('btn-fi-return').hidden = !!mine && here.key === 'home'; // déjà chez elle
  $('btn-fi-refuel').hidden = !mine || fuel >= tank - 0.5;
  $('btn-fi-split').hidden = go || countShips(f.ships) < 2;
  // Navette (D-556) : au moins un cargo et deux planètes ; allumé quand elle tourne.
  const shuttling = f.order?.kind === 'shuttle';
  const shuttle = $('btn-fi-shuttle');
  shuttle.hidden = !shuttling && !(f.ships.cargo > 0 && etat.session.planetsOf(me).length >= 2);
  shuttle.className = `${shuttling ? 'primary' : 'secondary'} small icon-only`;
  shuttle.setAttribute('aria-pressed', String(shuttling));
  const hawk = aggressive(f);
  const stance = $('btn-fi-stance');
  stance.hidden = !hawk && !armed(me.race, f.ships, me.planet?.tech);
  stance.className = `${hawk ? 'primary' : 'secondary'} small icon-only`;
  stance.setAttribute('aria-pressed', String(hawk));
  stance.title = hawk ? 'Agressive : combat toute flotte ennemie qu’elle croise. Toucher pour la rendre passive' : 'Passive : ne combat que sur ordre. Toucher pour la rendre agressive';
  renderBeside(me, f, now);
  renderPartners($('fi-partners'), go ? null : { fleet: f.id });
}
