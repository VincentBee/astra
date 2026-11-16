import { etat } from '../etat.js';
import { $ } from './dollar.js';
import { nextToast } from './next-toast.js';
import { toasts } from './toasts.js';

export function toast(text, ms = 3200) {
  if (document.visibilityState === 'hidden') return;
  if (toasts.some((t) => t.text === text) || (etat.toastTimer && $('toast').textContent === text)) return;
  toasts.push({ text, ms });
  if (toasts.length > 6) toasts.splice(Math.max(0, toasts.findIndex((t) => t.ms <= 3200)), 1); // les longs (élimination) restent
  if (!etat.toastTimer) nextToast();
}
