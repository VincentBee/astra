import { showSaved } from '../../accueil/show-saved.js';
import { etat } from '../../etat.js';
import { showSnapshot } from '../../lecture/show-snapshot.js';
import { VIEW } from '../../lecture/view.js';
import { boot } from '../boot.js';

if (VIEW) {
  document.documentElement.classList.add('view-only');
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data?.astraView) return;
    try {
      showSnapshot(e.data.astraView);
    } catch (err) {
      console.error(err);
      document.body.dataset.viewError = err.message;
    }
  });
  parent.postMessage({ astraViewReady: true }, location.origin);
} else {
  showSaved();
  boot();
  // Lien d'invitation ouvert alors que l'appli est déjà affichée dans cet onglet.
  window.addEventListener('hashchange', () => location.hash.length > 1 && !etat.session && boot());

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
