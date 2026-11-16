import { RACES, upgradeCost, buildDuration } from '../../../game.js';
import { etat } from '../etat.js';
import { cost } from '../outils/cost.js';
import { dur } from '../outils/dur.js';
import { esc } from '../outils/esc.js';

export function buildingPanel(key) {
  const R = RACES[etat.race];
  const b = R.buildings[key];
  const rows = [];
  for (let lv = 0; lv < 6; lv++) {
    const c = Object.fromEntries(Object.entries(upgradeCost(etat.race, key, lv)).filter(([, v]) => v > 0));
    rows.push(`<tr><td>${lv + 1}</td><td>${cost(c)}</td><td>${dur(buildDuration(etat.race, {}, upgradeCost(etat.race, key, lv)))}</td></tr>`);
  }
  const opens = {
    lab: 'Ouvre la recherche. Chaque technologie demande un niveau de labo, écrit dans sa bulle.',
    yard: 'Nécessaire pour construire chaque vaisseau.',
    amplifier: 'Renforce les deux pouvoirs psychiques : +25 % par niveau.',
  }[key];
  return `
    <div class="kind">Bâtiment</div>
    <h3>${esc(b.name)}</h3>
    <p>${esc(b.desc)}</p>
    ${opens ? `<p>${esc(opens)}</p>` : ''}
    <div class="tags"><span class="tag req">${b.start ? `niv. ${b.start} au départ` : 'à construire'}</span><span class="tag req">coût ×${String(b.factor).replace('.', ',')} par niveau</span></div>
    <table><thead><tr><th>Niv.</th><th>Coût</th><th>Durée</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
