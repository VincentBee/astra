import { showTab } from '../../partie/show-tab.js';

for (const b of document.querySelectorAll('[data-tab-btn]')) b.onclick = () => showTab(b.dataset.tabBtn);
