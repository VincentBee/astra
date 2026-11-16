import { showTab } from '../../partie/show-tab.js';

// Flèches gauche et droite : onglet voisin (visible).
document.querySelector('.tabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const tabs = [...document.querySelectorAll('[data-tab-btn]')].filter((b) => !b.hidden);
  const i = tabs.findIndex((b) => b.getAttribute('aria-selected') === 'true');
  const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
  showTab(next.dataset.tabBtn);
  next.focus();
});
