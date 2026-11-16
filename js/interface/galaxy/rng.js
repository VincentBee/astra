/** Un générateur pseudo-aléatoire stable : le même ciel à chaque ouverture. */
export function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}
