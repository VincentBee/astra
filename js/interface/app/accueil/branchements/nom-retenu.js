import { $ } from '../../outils/dollar.js';

try {
  $('name').value = localStorage.getItem('astra.name') || '';
} catch {}
