// Historique des mini-graphes (« sparklines ») des tuiles de ressources.
// Fonctions pures, sans DOM ni localStorage : app.js s'en sert, les tests aussi.
//
// Un historique par planète : { id: 'partie|joueur', p: { clé de planète: { t: [instants], v: { ressource: [valeurs] } } } }.
// Chaque planète garde ses 10 dernières minutes, même quand on regarde une autre planète.

export const SAMPLE_MS = 5000;
export const HISTORY_MS = 10 * 60_000;

/** Un historique vide pour cette partie et ce joueur. */
export const emptyHistory = (id) => ({ id, p: {} });

/** Garde l'historique s'il est bien celui de cette partie et de ce joueur, et au bon format ; sinon un vide. */
export function ownHistory(hist, id) {
  return hist?.id === id && hist.p && typeof hist.p === 'object' ? hist : emptyHistory(id);
}

/** On oublie les relevés de plus de 10 minutes. */
function prune(serie, now) {
  const drop = serie.t.findIndex((t) => now - t <= HISTORY_MS);
  const cut = drop < 0 ? serie.t.length : drop;
  if (cut <= 0) return;
  serie.t.splice(0, cut);
  for (const a of Object.values(serie.v)) a.splice(0, a.length - serie.t.length);
}

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

/**
 * Tracé SVG (viewBox 100 × 30) d'une ressource d'une planète, à l'échelle de ses
 * propres valeurs. null s'il y a moins de 2 relevés : la tuile n'a pas de courbe.
 */
export function sparkPath(hist, key, k) {
  const serie = hist?.p?.[key];
  if (!serie) return null;
  const vals = serie.v[k] || [];
  const n = Math.min(vals.length, serie.t.length);
  if (n < 2) return null;
  // Axe du temps : du plus ancien relevé au plus récent (10 min au plus).
  const t1 = serie.t[serie.t.length - 1];
  const t0 = serie.t[serie.t.length - n];
  const width = Math.max(1, t1 - t0);
  const shown = vals.slice(vals.length - n);
  const lo = Math.min(...shown), hi = Math.max(...shown);
  const span = hi - lo || 1;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = ((serie.t[serie.t.length - n + i] - t0) / width) * 100;
    const y = hi === lo ? 15 : 28 - ((shown[i] - lo) / span) * 26;
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const line = `M${pts.join('L')}`;
  const area = `${line}L${pts[pts.length - 1].split(',')[0]},30L${pts[0].split(',')[0]},30Z`;
  return { line, area };
}
