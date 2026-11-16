import { RACES } from '../../../../game.js';
import { etat } from '../../etat.js';
import { $ } from '../../outils/dollar.js';

$('buildings').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-build]');
  if (btn && !btn.disabled) {
    if (btn.dataset.mode === 'now') etat.session.build(btn.dataset.build, etat.openKey);
    else etat.session.planBuild(btn.dataset.build, etat.openKey);
  }
  const down = e.target.closest('[data-demolish]');
  if (down && !down.disabled) {
    const name = RACES[etat.session.myRace].buildings[down.dataset.demolish].name;
    if (confirm(`Déconstruire un niveau de ${name} ? Tu récupères la moitié de son prix et sa place.`)) etat.session.demolish(down.dataset.demolish, etat.openKey);
  }
});
