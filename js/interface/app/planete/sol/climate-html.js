import { climateName, resIcon } from '../../../../game.js';
import { climX } from './clim-x.js';

/** « Chaud · production ×1,2 ⚡ · ×1,1 ◆ · ×0,9 🍃 » : le climat et son effet sur la production, en HTML. */
export function climateHtml(c) {
  const cls = c.heat >= 0.6 ? 'hot' : c.heat < 0.4 ? 'cold' : 'mild';
  const name = `<span class="climate-name ${cls}">${climateName(c.heat)}</span>`;
  const qty = ['energy', 'minerals', 'food'].map((r) => `<span class="qty">${climX(c[r])}${resIcon(r)}</span>`);
  return `${name} · production ${qty.join(' · ')}`;
}
