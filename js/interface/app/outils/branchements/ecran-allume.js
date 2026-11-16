import { etat } from '../../etat.js';
import { keepAwake } from '../keep-awake.js';

document.addEventListener('visibilitychange', () => {
  if (etat.session && document.visibilityState === 'visible' && (!etat.wakeLock || etat.wakeLock.released)) keepAwake();
});
