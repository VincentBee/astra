import { etat } from '../../etat.js';
import { showAbsence } from '../show-absence.js';

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    etat.hiddenAt = Date.now();
    etat.awayFrom = etat.session?.journal?.n || 0;
    return;
  }
  if (!etat.hiddenAt) return;
  const gone = Date.now() - etat.hiddenAt;
  etat.hiddenAt = 0;
  // Le rattrapage tourne au passage suivant (toutes les 250 ms) : on lui laisse le temps.
  setTimeout(() => showAbsence(gone), 1000);
});
