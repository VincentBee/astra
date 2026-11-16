import { RACES, raceIcon } from '../../../game.js';
import { etat } from '../etat.js';
import { $ } from '../outils/dom.js';
import { esc } from '../outils/esc.js';
import { buildingPanel } from './building-panel.js';
import { powerPanel } from './power-panel.js';
import { shipPanel } from './ship-panel.js';
import { techPanel } from './tech-panel.js';

export function renderPanel() {
  const R = RACES[etat.race];
  if (!etat.selected) {
    $('panel').innerHTML = `
      <div class="kind">${raceIcon(etat.race)} ${esc(R.name)}</div>
      <h3>Choisis une bulle</h3>
      <p>À gauche les bâtiments (coins carrés), puis les technologies, les vaisseaux (en pointillés)${etat.race === 'alien' ? ' et les pouvoirs (arrondis)' : ''}. Chaque flèche part de ce qu’il faut avoir avant.</p>
      <p>La recherche demande d’abord un labo sur la planète mère : ${esc(R.buildings.lab.name)}. « ${esc(R.buildings.lab.short)} 2 » veut dire qu’il doit être au niveau 2.</p>`;
    return;
  }
  const n = etat.graph.nodes[etat.selected];
  $('panel').innerHTML = { tech: () => techPanel(n.id), ship: () => shipPanel(n.type), building: () => buildingPanel(n.key), power: () => powerPanel(n.key) }[n.kind]();
}
