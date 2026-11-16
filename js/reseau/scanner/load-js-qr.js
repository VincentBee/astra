import { etat } from './etat.js';

export function loadJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  etat.jsQRLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL('../../../vendor/jsQR.js', import.meta.url).href;
    s.onload = () => resolve(window.jsQR);
    s.onerror = () => {
      // Pas de promesse ratée gardée en mémoire (#86) : le prochain Scanner refait la requête.
      etat.jsQRLoading = null;
      s.remove?.();
      reject(new Error('Lecteur de QR introuvable.'));
    };
    document.head.append(s);
  });
  return etat.jsQRLoading;
}
