import { TECHS, SHIPS, techCost, researchDuration } from '../../../tech.js';
import { RACES } from '../../../game.js';
import { BONUS } from '../donnees/bonus.js';
import { etat } from '../etat.js';
import { cost } from '../outils/cost.js';
import { dur } from '../outils/dur.js';
import { esc } from '../outils/esc.js';
import { techReqs } from '../outils/tech-reqs.js';

export function techPanel(key) {
  const t = TECHS[etat.race][key];
  const lab = RACES[etat.race].buildings.lab.short;
  const tags = [];
  for (const [type, lv] of Object.entries(t.unlock || {})) {
    tags.push(`<span class="tag unlock">▸ ${esc(SHIPS[etat.race][type].name)}${lv > 1 ? ` (niv. ${lv})` : ''}</span>`);
  }
  for (const [b, v] of Object.entries(t.bonus || {})) tags.push(`<span class="tag">+${Math.round(v * 100)} % ${BONUS[b]}</span>`);
  if (t.range) tags.push(`<span class="tag">+${t.range} case de détection</span>`);
  tags.push(`<span class="tag req">${esc(lab)} ${t.req.lab}</span>`);
  for (const [k, lv] of techReqs(t)) tags.push(`<span class="tag req">${esc(TECHS[etat.race][k].name)} ${lv}</span>`);

  const rows = [];
  for (let lv = 0; lv < t.max; lv++) {
    const c = techCost(etat.race, key, lv);
    rows.push(`<tr><td>${lv + 1}</td><td>${cost(c)}</td><td>${dur(researchDuration(c, t.req.lab))}</td></tr>`);
  }
  return `
    <div class="kind">Technologie</div>
    <h3>${esc(t.name)}</h3>
    <p>${esc(t.desc)}</p>
    <div class="tags">${tags.join('')}</div>
    <table><thead><tr><th>Niv.</th><th>Coût</th><th>Durée</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}
