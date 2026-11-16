import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';
import { updateRacePick } from '../update-race-pick.js';

$('races').addEventListener('click', (e) => {
  const el = e.target.closest('[data-race]');
  if (!el) return;
  etat.pickedRace = el.dataset.race;
  updateRacePick();
});
