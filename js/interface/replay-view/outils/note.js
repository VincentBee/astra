import { $ } from './dom.js';

export function note(text) {
  $('rp-note').textContent = text;
  $('rp-note').hidden = !text;
}
