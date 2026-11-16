/** Graduation ronde au-dessus de `v` : 1, 2 ou 5 × 10ⁿ. */
export function niceMax(v) {
  if (v <= 0) return 10;
  const m = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((k) => k * m).find((x) => x >= v);
}
