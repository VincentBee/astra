/** a x L x 1.1^L, arrondi au millionième (évite le bruit des flottants). */
export function curve(a, level) {
  return Math.round(a * level * Math.pow(1.1, level) * 1e6) / 1e6;
}
