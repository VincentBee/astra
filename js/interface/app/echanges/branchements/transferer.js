import { etat } from '../../etat.js';
import { renderFleetInfo } from '../../flotte/pilotage/render-fleet-info.js';
import { $ } from '../../outils/dollar.js';
import { refreshMoveSheet } from '../refresh-move-sheet.js';

$('btn-move-go').onclick = () => {
  const part = { ships: {}, cargo: {}, fuel: 0 };
  for (const el of document.querySelectorAll('[data-mship]')) part.ships[el.dataset.mship] = Math.max(0, Math.floor(Number(el.value) || 0));
  for (const el of document.querySelectorAll('[data-mcargo]')) part.cargo[el.dataset.mcargo] = Math.max(0, Math.floor(Number(el.value) || 0));
  part.fuel = Math.max(0, Math.floor(Number(document.querySelector('[data-mfuel]')?.value) || 0));
  const ok = etat.moveSheet?.kind === 'give' ? etat.session.transferFleet(etat.moveSheet.from, etat.moveSheet.to, part) : etat.session.splitFleet(etat.moveSheet?.from, part);
  if (!ok) return refreshMoveSheet();
  $('sheet-move').hidden = true;
  etat.moveSheet = null;
  renderFleetInfo();
};
