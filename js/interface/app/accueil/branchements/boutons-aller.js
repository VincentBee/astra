import { etat } from '../../etat.js';
import { show } from '../../outils/show.js';
import { showSaved } from '../show-saved.js';

for (const el of document.querySelectorAll('[data-go]')) {
  el.onclick = () => {
    etat.session?.end?.();
    etat.session = null;
    show(el.dataset.go);
    showSaved();
  };
}
