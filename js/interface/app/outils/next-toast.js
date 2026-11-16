import { etat } from '../etat.js';
import { $ } from './dollar.js';
import { toasts } from './toasts.js';

export function nextToast() {
  const t = $('toast');
  const next = toasts.shift();
  t.hidden = !next;
  if (!next) return (etat.toastTimer = null);
  t.textContent = next.text;
  etat.toastTimer = setTimeout(nextToast, toasts.length ? Math.max(2000, next.ms / 2) : next.ms);
}
