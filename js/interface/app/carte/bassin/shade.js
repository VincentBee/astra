/**
 * Couleur `#rrggbb` éclaircie (k > 0, vers le blanc) ou assombrie (k < 0, vers le noir),
 * avec une opacité `a` : 'rgba(…)'.
 */
export function shade(hex, k = 0, a = 1) {
  const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0;
  const mix = (v) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgba(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)},${a})`;
}
