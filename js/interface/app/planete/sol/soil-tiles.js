import { RES_INFO, resIcon, SOIL } from '../../../../game.js';
import { spark } from '../courbes/spark.js';
import { SOIL_NAMES } from './soil-names.js';

export function soilTiles(prefix) {
  return SOIL.map((r) => {
    const name = SOIL_NAMES[r] || RES_INFO[r].name;
    return `<div class="tile ${r}" data-${prefix}-tile="${r}">${prefix === 'soil' ? spark(`soil-${r}`) : ''}
      <span class="label">${resIcon(r, name)}${name}</span>
      <span class="amount mono" data-${prefix}-amount="${r}"></span>
      <span class="rate mono" data-${prefix}-rate="${r}"></span>
      <span class="rate mono" data-${prefix}-detail="${r}"></span>
      <div class="gauge"><div class="gauge-fill" data-${prefix}-gauge="${r}"></div></div>
    </div>`;
  }).join('');
}
