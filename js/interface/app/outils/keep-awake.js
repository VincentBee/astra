import { etat } from '../etat.js';

export async function keepAwake() {
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible') {
      etat.wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch {}
}
