import { prune } from './prune.js';
import { SAMPLE_MS } from './sample-ms.js';

/**
 * Ajoute un relevé à la planète `key`, au plus un toutes les 5 s.
 * Les autres planètes ne bougent pas. Rend true si un relevé a été ajouté.
 */
export function addSample(hist, key, now, values) {
  const serie = (hist.p[key] ||= { t: [], v: {} });
  prune(serie, now);
  if (serie.t.length && now - serie.t[serie.t.length - 1] < SAMPLE_MS) return false;
  serie.t.push(now);
  for (const [k, v] of Object.entries(values)) (serie.v[k] ||= []).push(Math.round(v * 10) / 10);
  return true;
}
