import { topSheet } from '../../outils/top-sheet.js';

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  topSheet()?.querySelector('.close-btn')?.click();
});
