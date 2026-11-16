import { sparkPath } from '../../../spark/index.js';
import { etat } from '../../etat.js';

/** Courbe de chaque tuile pour la planète `key`, vide s'il y a moins de 2 relevés. */
export function drawSparks(key = etat.openKey) {
  for (const svg of document.querySelectorAll('[data-spark]')) {
    const path = sparkPath(etat.hist, key, svg.dataset.spark);
    svg.querySelector('.spark-line').setAttribute('d', path?.line ?? '');
    svg.querySelector('.spark-area').setAttribute('d', path?.area ?? '');
  }
}
