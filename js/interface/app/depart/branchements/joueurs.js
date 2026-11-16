import { $ } from '../../outils/dollar.js';
import { openBotSheet } from '../open-bot-sheet.js';

$('pick-who').addEventListener('click', (e) => {
  const el = e.target.closest('[data-bot]');
  if (el) openBotSheet(el.dataset.bot);
});
