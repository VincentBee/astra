import { $ } from '../outils/dollar.js';

export function joinError(msg) {
  $('join-error').textContent = msg;
  $('join-error').hidden = false;
}
