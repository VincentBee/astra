import { addSample, ownHistory } from '../../../spark/index.js';
import { etat } from '../../etat.js';
import { drawSparks } from './draw-sparks.js';
import { HISTORY_KEY } from './history-key.js';

export function sampleHistory(now, values, key) {
  const id = `${etat.session.state.gid}|${etat.session.me}`;
  if (etat.hist?.id !== id) {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
    } catch {}
    etat.hist = ownHistory(saved, id);
  }
  if (addSample(etat.hist, key, now, values)) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(etat.hist));
    } catch {}
  }
  drawSparks(key);
}
