import { $ } from '../../outils/dollar.js';
import { openTradeSheet } from '../open-trade-sheet.js';

for (const box of ['fi-partners', 'planet-partners']) {
  $(box).addEventListener('click', (e) => {
    const raw = e.target.closest('[data-trade]')?.dataset.trade;
    if (raw) openTradeSheet(JSON.parse(raw));
  });
}
