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
